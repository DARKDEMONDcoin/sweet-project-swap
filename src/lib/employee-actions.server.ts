/**
 * «الإجراءات الحقيقية» لكل موظف: بعد اعتمادك، ينفّذ الموظف الفعل نفسه
 * (إرسال بريد، حجز موعد، إضافة جهة اتصال أو صفقة، تسجيل صف في شيتس، رسالة سلاك…)
 * عبر إجراءات Pipedream الجاهزة — بلا أي توكن مخزّن لدينا.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { pipedreamAction, pipedreamApp } from "@/data/pipedream-apps";
import { pipedreamConfig, runAction, missingConfigError } from "./pipedream.server";

type Admin = SupabaseClient<Database>;

export type EmployeeActionDef = {
  /** معرّف الإجراء داخل منصتنا. */
  id: string;
  employeeId: string;
  provider: string;
  /** مفتاح الإجراء داخل خريطة التطبيق. */
  action: string;
  label: string;
  /** الحقول المطلوبة من المستخدم. */
  inputs: { name: string; label: string; required?: boolean }[];
  /** تحويل مدخلات المستخدم إلى خصائص إجراء Pipedream. */
  toProps: (v: Record<string, string>) => Record<string, unknown>;
};

export const employeeActions: EmployeeActionDef[] = [
  {
    id: "eva-send-email",
    employeeId: "eva",
    provider: "gmail",
    action: "send",
    label: "إرسال بريد من جيميل",
    inputs: [
      { name: "to", label: "المستلم", required: true },
      { name: "subject", label: "الموضوع", required: true },
      { name: "body", label: "النص", required: true },
    ],
    toProps: (v) => ({ to: [v["to"]], subject: v["subject"], body: v["body"], bodyType: "plaintext" }),
  },
  {
    id: "eva-draft-email",
    employeeId: "eva",
    provider: "gmail",
    action: "draft",
    label: "حفظ مسودة بريد",
    inputs: [
      { name: "to", label: "المستلم", required: true },
      { name: "subject", label: "الموضوع", required: true },
      { name: "body", label: "النص", required: true },
    ],
    toProps: (v) => ({ to: [v["to"]], subject: v["subject"], body: v["body"], bodyType: "plaintext" }),
  },
  {
    id: "eva-outlook-send",
    employeeId: "eva",
    provider: "outlook",
    action: "send",
    label: "إرسال بريد من أوتلوك",
    inputs: [
      { name: "to", label: "المستلم", required: true },
      { name: "subject", label: "الموضوع", required: true },
      { name: "body", label: "النص", required: true },
    ],
    toProps: (v) => ({ toRecipients: [v["to"]], subject: v["subject"], content: v["body"] }),
  },
  {
    id: "eva-create-event",
    employeeId: "eva",
    provider: "calendar",
    action: "createEvent",
    label: "حجز موعد في التقويم",
    inputs: [
      { name: "summary", label: "عنوان الموعد", required: true },
      { name: "start", label: "البداية (ISO)", required: true },
      { name: "end", label: "النهاية (ISO)", required: true },
      { name: "attendees", label: "الحضور (بريد مفصول بفاصلة)" },
    ],
    toProps: (v) => ({
      calendarId: "primary",
      summary: v["summary"],
      eventStartDate: v["start"],
      eventEndDate: v["end"],
      attendees: (v["attendees"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    id: "sam-create-contact",
    employeeId: "sam",
    provider: "hubspot",
    action: "createContact",
    label: "إضافة جهة اتصال في هابسبوت",
    inputs: [
      { name: "email", label: "البريد", required: true },
      { name: "firstname", label: "الاسم الأول" },
      { name: "lastname", label: "الاسم الأخير" },
      { name: "company", label: "الشركة" },
    ],
    toProps: (v) => ({
      properties: {
        email: v["email"],
        firstname: v["firstname"] ?? "",
        lastname: v["lastname"] ?? "",
        company: v["company"] ?? "",
      },
    }),
  },
  {
    id: "sam-create-deal",
    employeeId: "sam",
    provider: "hubspot",
    action: "createDeal",
    label: "إنشاء صفقة في هابسبوت",
    inputs: [
      { name: "dealname", label: "اسم الصفقة", required: true },
      { name: "amount", label: "القيمة" },
      { name: "dealstage", label: "المرحلة" },
    ],
    toProps: (v) => ({
      properties: {
        dealname: v["dealname"],
        amount: v["amount"] ?? "",
        dealstage: v["dealstage"] ?? "",
      },
    }),
  },
  {
    id: "sam-log-sheet",
    employeeId: "sam",
    provider: "sheets",
    action: "appendRow",
    label: "تسجيل صف في جوجل شيتس",
    inputs: [
      { name: "sheetId", label: "معرّف الملف", required: true },
      { name: "sheetName", label: "اسم الورقة", required: true },
      { name: "row", label: "القيم مفصولة بفاصلة", required: true },
    ],
    toProps: (v) => ({
      sheetId: v["sheetId"],
      sheetName: v["sheetName"],
      cells: (v["row"] ?? "").split(",").map((s) => s.trim()),
    }),
  },
  {
    id: "adam-log-sheet",
    employeeId: "adam",
    provider: "sheets",
    action: "appendRow",
    label: "تسجيل نتيجة قياس في شيتس",
    inputs: [
      { name: "sheetId", label: "معرّف الملف", required: true },
      { name: "sheetName", label: "اسم الورقة", required: true },
      { name: "row", label: "القيم مفصولة بفاصلة", required: true },
    ],
    toProps: (v) => ({
      sheetId: v["sheetId"],
      sheetName: v["sheetName"],
      cells: (v["row"] ?? "").split(",").map((s) => s.trim()),
    }),
  },
  {
    id: "team-slack-note",
    employeeId: "*",
    provider: "slack",
    action: "send",
    label: "إرسال رسالة سلاك للفريق",
    inputs: [
      { name: "channel", label: "القناة", required: true },
      { name: "text", label: "النص", required: true },
    ],
    toProps: (v) => ({ conversation: v["channel"], text: v["text"] }),
  },
];

export function actionsFor(employeeId: string): EmployeeActionDef[] {
  return employeeActions.filter((a) => a.employeeId === employeeId || a.employeeId === "*");
}

export function getEmployeeAction(id: string): EmployeeActionDef | undefined {
  return employeeActions.find((a) => a.id === id);
}

/** ينفّذ إجراءً فعلياً على حساب مربوط للمساحة. */
export async function runEmployeeActionServer(
  admin: Admin,
  params: { workspaceId: string; actionId: string; values: Record<string, string> },
): Promise<{ actionId: string; provider: string; result: unknown }> {
  const def = getEmployeeAction(params.actionId);
  if (!def) throw new Error("إجراء غير معروف.");

  const missing = def.inputs
    .filter((i) => i.required && !params.values[i.name]?.trim())
    .map((i) => i.label);
  if (missing.length) throw new Error(`حقول ناقصة: ${missing.join("، ")}`);

  const action = pipedreamAction(def.provider, def.action);
  const app = pipedreamApp(def.provider);
  if (!action || !app) throw new Error("هذا الإجراء غير مدعوم على هذه المنصة بعد.");

  const config = await pipedreamConfig();
  if (!config) throw missingConfigError();

  const { data: account } = await admin
    .from("pipedream_accounts")
    .select("account_id")
    .eq("workspace_id", params.workspaceId)
    .eq("provider", def.provider)
    .eq("status", "connected")
    .maybeSingle();
  if (!account) throw new Error(`${app.label} غير مربوط بعد — اربطه من صفحة التكاملات.`);

  const result = await runAction(config, {
    workspaceId: params.workspaceId,
    componentId: action.component,
    configuredProps: {
      [action.accountProp]: { authProvisionId: account.account_id },
      ...def.toProps(params.values),
    },
  });

  return { actionId: def.id, provider: def.provider, result };
}
