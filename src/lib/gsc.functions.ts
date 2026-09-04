import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly";

export type SearchConsoleConfig = {
  refreshToken: string;
  siteUrl?: string;
  email?: string;
};

let credsCache: { at: number; clientId: string; clientSecret: string } | null = null;

/** يقرأ مفاتيح Google OAuth من Supabase (جدول app_secrets) — Supabase هو مصدر الأسرار الوحيد. */
export async function googleCreds(): Promise<{ clientId: string; clientSecret: string }> {
  if (credsCache && Date.now() - credsCache.at < 5 * 60 * 1000) {
    return { clientId: credsCache.clientId, clientSecret: credsCache.clientSecret };
  }
  let clientId = "";
  let clientSecret = "";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_secrets")
      .select("name, value")
      .in("name", ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]);
    for (const row of (data ?? []) as { name: string; value: string }[]) {
      if (row.name === "GOOGLE_OAUTH_CLIENT_ID") clientId = row.value ?? "";
      if (row.name === "GOOGLE_OAUTH_CLIENT_SECRET") clientSecret = row.value ?? "";
    }
  } catch {
    // نسقط على متغيرات البيئة
  }
  if (!clientId) clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
  if (!clientSecret) clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"] ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "ربط Search Console غير مُفعّل بعد: أضف GOOGLE_OAUTH_CLIENT_ID و GOOGLE_OAUTH_CLIENT_SECRET في جدول app_secrets بقاعدة Supabase.",
    );
  }
  credsCache = { at: Date.now(), clientId, clientSecret };
  return { clientId, clientSecret };
}

/** توقيع بسيط لحالة OAuth حتى لا يُتلاعب بها. */
async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );
}

export async function encodeState(workspaceId: string): Promise<string> {
  const { clientSecret } = await googleCreds();
  const payload = `${workspaceId}.${Date.now()}`;
  return `${btoa(payload)}~${await sign(payload, clientSecret)}`;
}

export async function decodeState(state: string): Promise<string> {
  const { clientSecret } = await googleCreds();
  const [encoded, mac] = state.split("~");
  if (!encoded || !mac) throw new Error("Invalid state");
  const payload = atob(encoded);
  if ((await sign(payload, clientSecret)) !== mac) throw new Error("Invalid state signature");
  const [workspaceId, ts] = payload.split(".");
  if (!workspaceId || !ts) throw new Error("Invalid state payload");
  if (Date.now() - Number(ts) > 15 * 60 * 1000) throw new Error("انتهت صلاحية الرابط — أعد المحاولة.");
  return workspaceId;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/public/gsc/callback`;
}

/** يبدأ ربط Search Console ويُعيد رابط موافقة Google. */
export const startSearchConsoleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: owns, error } = await context.supabase.rpc("owns_workspace", {
      _workspace_id: data.workspaceId,
    });
    if (error) throw new Error(error.message);
    if (owns !== true) throw new Error("Forbidden: لا تملك هذه مساحة العمل.");

    const origin = new URL(getRequest().url).origin;
    const { pipedreamConfig, createConnectToken, missingConfigError } = await import("./pipedream.server");
    const config = await pipedreamConfig();
    if (!config) throw missingConfigError();
    const token = await createConnectToken(config, data.workspaceId, [origin]);
    const url = new URL(
      token.connect_link_url ??
        `https://pipedream.com/_static/connect.html?token=${encodeURIComponent(token.token)}`,
    );
    url.searchParams.set("app", "google_search_console");
    url.searchParams.set("success_redirect_uri", `${origin}/app/integrations?pd=connected`);
    url.searchParams.set("error_redirect_uri", `${origin}/app/integrations?pd=failed`);
    return { url: url.toString(), redirectUri: `${origin}/app/integrations` };
  });

export async function accessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = await googleCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[gsc] refresh failed [${res.status}]: ${text.slice(0, 300)}`);
    throw new Error("انتهت صلاحية ربط Search Console — أعد الربط من صفحة التكاملات.");
  }
  return (JSON.parse(text) as { access_token: string }).access_token;
}

export async function loadConfig(workspaceId: string): Promise<SearchConsoleConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integration_credentials")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "search-console")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const config = data?.config as SearchConsoleConfig | undefined;
  if (!config?.refreshToken) throw new Error("Search Console غير مربوط بعد.");
  return config;
}

async function assertOwner(
  supabase: { rpc: (fn: "owns_workspace", args: { _workspace_id: string }) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  workspaceId: string,
) {
  const { data, error } = await supabase.rpc("owns_workspace", { _workspace_id: workspaceId });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: لا تملك هذه مساحة العمل.");
}

/** قائمة المواقع المتحقَّقة في حساب Search Console المربوط. */
export const listSearchConsoleSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.workspaceId);
    const { googleDataRequest } = await import("./google-data.server");
    const { siteEntry = [] } = await googleDataRequest<{
      siteEntry?: { siteUrl: string; permissionLevel?: string }[];
    }>(data.workspaceId, "search-console", "https://searchconsole.googleapis.com/webmasters/v3/sites");
    return {
      sites: siteEntry
        .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
        .map((s) => s.siteUrl),
      selected: config.siteUrl ?? null,
    };
  });

/** اختيار الموقع الذي ستقرأ نور بياناته. */
export const selectSearchConsoleSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), siteUrl: z.string().min(4).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.workspaceId);
    const config = await loadConfig(data.workspaceId).catch(() => ({ refreshToken: "" }));
    const { googleDataRequest } = await import("./google-data.server");
    const { siteEntry = [] } = await googleDataRequest<{
      siteEntry?: { siteUrl: string; permissionLevel?: string }[];
    }>(data.workspaceId, "search-console", "https://searchconsole.googleapis.com/webmasters/v3/sites");
    const match = siteEntry.find(
      (s) => s.siteUrl === data.siteUrl && s.permissionLevel !== "siteUnverifiedUser",
    );
    if (!match) throw new Error("هذا الموقع غير متحقَّق في الحساب المربوط.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("integration_credentials").upsert(
      {
        workspace_id: data.workspaceId,
        provider: "search-console",
        config: { ...config, siteUrl: match.siteUrl } as unknown as Record<string, string>,
      },
      { onConflict: "workspace_id,provider" },
    );
    await supabaseAdmin
      .from("integrations")
      .update({ status: "connected", account: `${match.siteUrl}${config.email ? ` · ${config.email}` : ""}` })
      .eq("workspace_id", data.workspaceId)
      .eq("provider", "search-console");
    return { ok: true as const, siteUrl: match.siteUrl };
  });

export type GscRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * لقطة Search Console للاستخدام الداخلي (بعد التحقق من الملكية عند المنادي).
 * ترجع null إن لم يكن الربط جاهزاً — حتى لا تتعطل المحادثة.
 */
export async function gscSnapshotFor(
  workspaceId: string,
  days = 28,
): Promise<{ site: string; range: { start: string; end: string }; queries: GscRow[]; pages: GscRow[] } | null> {
  try {
    const config = await loadConfig(workspaceId);
    if (!config.siteUrl) return null;
    const token = await accessToken(config.refreshToken);
    const end = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const start = new Date(Date.now() - (days + 3) * 86_400_000).toISOString().slice(0, 10);

    const query = async (dimension: "query" | "page"): Promise<GscRow[]> => {
      const res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.siteUrl!)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: start, endDate: end, dimensions: [dimension], rowLimit: 25 }),
        },
      );
      if (!res.ok) return [];
      const { rows = [] } = (await res.json()) as {
        rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
      };
      return rows.map((r) => ({
        key: r.keys[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));
    };

    const [queries, pages] = await Promise.all([query("query"), query("page")]);
    return { site: config.siteUrl, range: { start, end }, queries, pages };
  } catch {
    return null;
  }
}

/** أعلى الاستعلامات والصفحات في آخر ٢٨ يوماً — بيانات حقيقية لنور. */
export const searchConsoleSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.workspaceId);
    const config = await loadConfig(data.workspaceId);
    if (!config.siteUrl) throw new Error("اختر موقعاً من قائمة Search Console أولاً.");
    const token = await accessToken(config.refreshToken);

    const end = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const start = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);

    const query = async (dimension: "query" | "page") => {
      const res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.siteUrl!)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: start, endDate: end, dimensions: [dimension], rowLimit: 25 }),
        },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`Search Console رفض الطلب [${res.status}]: ${text.slice(0, 200)}`);
      const { rows = [] } = JSON.parse(text) as {
        rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
      };
      return rows.map((r) => ({
        key: r.keys[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));
    };

    const [queries, pages] = await Promise.all([query("query"), query("page")]);
    return { site: config.siteUrl, range: { start, end }, queries, pages };
  });
