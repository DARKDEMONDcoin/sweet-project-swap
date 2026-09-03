/**
 * مفاتيح مزوّدي الذكاء الاصطناعي تُقرأ من قاعدة بيانات Supabase (جدول app_secrets)
 * — Supabase هو الباك إند الوحيد لتخزين المفاتيح. لا اعتماد على أي خدمة أسرار خارجية.
 */

type Keys = { gemini: string; openrouter: string };

let cache: { at: number; keys: Keys } | null = null;
const TTL = 5 * 60 * 1000;

export async function providerKeys(): Promise<Keys> {
  if (cache && Date.now() - cache.at < TTL) return cache.keys;

  const keys: Keys = { gemini: "", openrouter: "" };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_secrets")
      .select("name, value")
      .in("name", ["GEMINI_API_KEY", "OPENROUTER_API_KEY"]);
    for (const row of (data ?? []) as { name: string; value: string }[]) {
      if (row.name === "GEMINI_API_KEY") keys.gemini = row.value ?? "";
      if (row.name === "OPENROUTER_API_KEY") keys.openrouter = row.value ?? "";
    }
  } catch {
    // تجاهل: نسقط على متغيرات البيئة أدناه
  }

  if (!keys.gemini) keys.gemini = process.env["GEMINI_API_KEY"] ?? "";
  if (!keys.openrouter) keys.openrouter = process.env["OPENROUTER_API_KEY"] ?? "";

  cache = { at: Date.now(), keys };
  return keys;
}
