/**
 * خريطة منصاتنا ← تطبيقات Pipedream وإجراءاتها الجاهزة.
 * كل موظف يعمل على منصاته عبر Pipedream كوسيط واحد لكل التكاملات.
 */

export type PipedreamApp = {
  /** المعرّف داخل منصتنا (نفس عمود provider في جدول integrations). */
  provider: string;
  /** اسم التطبيق لدى Pipedream (app slug). */
  slug: string;
  /** الاسم العربي للعرض. */
  label: string;
  /** إجراء النشر/الإرسال الأساسي إن وُجد. */
  publishComponent?: string;
  /** اسم خانة الحساب داخل configured_props للإجراء. */
  accountProp?: string;
  /** ملاحظة تشغيلية تُعرض للمستخدم قبل الربط. */
  note?: string;
};

export const pipedreamApps: PipedreamApp[] = [
  {
    provider: "instagram",
    slug: "instagram_business",
    label: "إنستجرام",
    publishComponent: "instagram_business-create-media-post",
    accountProp: "instagram_business",
    note: "يتطلب حساب Instagram احترافي مرتبط بصفحة فيسبوك.",
  },
  {
    provider: "facebook",
    slug: "facebook_pages",
    label: "فيسبوك",
    publishComponent: "facebook_pages-create-post",
    accountProp: "facebook_pages",
    note: "الربط يتم على مستوى الصفحة وليس الحساب الشخصي.",
  },
  {
    provider: "linkedin",
    slug: "linkedin",
    label: "لينكدإن",
    publishComponent: "linkedin-create-text-post-user",
    accountProp: "linkedin",
  },
  {
    provider: "x",
    slug: "twitter",
    label: "إكس",
    publishComponent: "twitter-create-tweet",
    accountProp: "twitter",
    note: "النشر عبر واجهة X يتطلب خطة مطوّر مدفوعة لدى X.",
  },
  {
    provider: "tiktok",
    slug: "tiktok",
    label: "تيك توك",
    note: "النشر المباشر يحتاج اعتماد تطبيقك من TikTok؛ الربط متاح الآن للقراءة.",
  },
  {
    provider: "youtube",
    slug: "youtube_data_api",
    label: "يوتيوب",
    publishComponent: "youtube_data_api-upload-video",
    accountProp: "youtubeDataApi",
  },
  { provider: "threads", slug: "threads", label: "ثريدز" },
  {
    provider: "gmail",
    slug: "gmail",
    label: "جيميل",
    publishComponent: "gmail-send-email",
    accountProp: "gmail",
  },
  { provider: "calendar", slug: "google_calendar", label: "تقويم جوجل" },
  { provider: "whatsapp", slug: "whatsapp_business", label: "واتساب للأعمال" },
  {
    provider: "hubspot",
    slug: "hubspot",
    label: "هابسبوت",
    publishComponent: "hubspot-create-contact",
    accountProp: "hubspot",
  },
  { provider: "sheets", slug: "google_sheets", label: "جوجل شيتس" },
  { provider: "drive", slug: "google_drive", label: "جوجل درايف" },
  { provider: "slack", slug: "slack", label: "سلاك", publishComponent: "slack-send-message", accountProp: "slack" },
  { provider: "notion", slug: "notion", label: "نوشن" },
  { provider: "telegram", slug: "telegram_bot_api", label: "تيليجرام" },
  { provider: "figma", slug: "figma", label: "فيجما" },
  { provider: "canva", slug: "canva", label: "كانفا" },
  { provider: "meta-ads", slug: "facebook_ads", label: "إعلانات ميتا" },
];

const byProvider = new Map(pipedreamApps.map((a) => [a.provider, a]));

export function pipedreamApp(provider: string): PipedreamApp | undefined {
  return byProvider.get(provider);
}

/** المنصات التي يديرها Pipedream نيابة عنا. */
export function isPipedreamProvider(provider: string): boolean {
  return byProvider.has(provider);
}
