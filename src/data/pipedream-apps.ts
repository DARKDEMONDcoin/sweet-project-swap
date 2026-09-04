/**
 * خريطة منصاتنا ← تطبيقات Pipedream وإجراءاتها الجاهزة.
 * كل موظف يعمل على منصاته عبر Pipedream كوسيط واحد لكل التكاملات.
 *
 * المنطق مطابق لمنظومة Marblism (Eva/Sonny/Penny/Stan) وأوسع منها:
 * لكل تطبيق «قراءة» تغذّي الموظف بالواقع، و«إجراءات» ينفّذها فعلياً بعد اعتمادك.
 */

export type PipedreamAction = {
  /** معرّف المكوّن لدى Pipedream. */
  component: string;
  /** اسم خانة الحساب داخل configured_props. */
  accountProp: string;
  /** وصف عربي للإجراء يظهر في الواجهة. */
  label: string;
};

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
  /** إجراءات إضافية يستطيع الموظف تنفيذها على هذا التطبيق. */
  actions?: Record<string, PipedreamAction>;
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
  { provider: "pinterest", slug: "pinterest", label: "بينترست" },
  {
    provider: "gmail",
    slug: "gmail",
    label: "جيميل",
    publishComponent: "gmail-send-email",
    accountProp: "gmail",
    actions: {
      send: { component: "gmail-send-email", accountProp: "gmail", label: "إرسال بريد" },
      draft: { component: "gmail-create-draft", accountProp: "gmail", label: "حفظ مسودة بريد" },
    },
  },
  {
    provider: "outlook",
    slug: "microsoft_outlook",
    label: "أوتلوك",
    publishComponent: "microsoft_outlook-send-email",
    accountProp: "microsoft_outlook",
    actions: {
      send: {
        component: "microsoft_outlook-send-email",
        accountProp: "microsoft_outlook",
        label: "إرسال بريد",
      },
    },
  },
  {
    provider: "calendar",
    slug: "google_calendar",
    label: "تقويم جوجل",
    actions: {
      createEvent: {
        component: "google_calendar-create-event",
        accountProp: "googleCalendar",
        label: "إنشاء موعد",
      },
    },
  },
  {
    provider: "search-console",
    slug: "google_search_console",
    label: "Google Search Console",
    note: "تقرأ نور المواقع والكلمات والنقرات عبر ربط Google الرسمي.",
  },
  {
    provider: "analytics",
    slug: "google_analytics",
    label: "Google Analytics 4",
    note: "يقرأ آدم خصائص GA4 والجلسات والتحويلات عبر ربط Google الرسمي.",
  },
  { provider: "whatsapp", slug: "whatsapp_business", label: "واتساب للأعمال" },
  {
    provider: "hubspot",
    slug: "hubspot",
    label: "هابسبوت",
    publishComponent: "hubspot-create-contact",
    accountProp: "hubspot",
    actions: {
      createContact: {
        component: "hubspot-create-contact",
        accountProp: "hubspot",
        label: "إضافة جهة اتصال",
      },
      createDeal: { component: "hubspot-create-deal", accountProp: "hubspot", label: "إنشاء صفقة" },
    },
  },
  {
    provider: "salesforce",
    slug: "salesforce_rest_api",
    label: "سيلزفورس",
    actions: {
      createLead: {
        component: "salesforce_rest_api-create-lead",
        accountProp: "salesforce_rest_api",
        label: "إضافة عميل محتمل",
      },
    },
  },
  {
    provider: "sheets",
    slug: "google_sheets",
    label: "جوجل شيتس",
    actions: {
      appendRow: {
        component: "google_sheets-add-single-row",
        accountProp: "googleSheets",
        label: "إضافة صف",
      },
    },
  },
  { provider: "drive", slug: "google_drive", label: "جوجل درايف" },
  {
    provider: "slack",
    slug: "slack",
    label: "سلاك",
    publishComponent: "slack-send-message",
    accountProp: "slack",
    actions: {
      send: { component: "slack-send-message", accountProp: "slack", label: "إرسال رسالة" },
    },
  },
  {
    provider: "notion",
    slug: "notion",
    label: "نوشن",
    actions: {
      createPage: { component: "notion-create-page", accountProp: "notion", label: "إنشاء صفحة" },
    },
  },
  {
    provider: "airtable",
    slug: "airtable_oauth",
    label: "إيرتيبل",
    actions: {
      createRecord: {
        component: "airtable_oauth-create-single-record",
        accountProp: "airtable_oauth",
        label: "إضافة سجل",
      },
    },
  },
  {
    provider: "mailchimp",
    slug: "mailchimp",
    label: "ميلتشمب",
    actions: {
      addSubscriber: {
        component: "mailchimp-add-subscriber-to-list",
        accountProp: "mailchimp",
        label: "إضافة مشترك",
      },
    },
  },
  { provider: "stripe", slug: "stripe", label: "سترايب" },
  {
    provider: "telegram",
    slug: "telegram_bot_api",
    label: "تيليجرام",
    publishComponent: "telegram_bot_api-send-message",
    accountProp: "telegram_bot_api",
    actions: {
      send: {
        component: "telegram_bot_api-send-message",
        accountProp: "telegram_bot_api",
        label: "إرسال رسالة تيليجرام",
      },
    },
  },
  { provider: "figma", slug: "figma", label: "فيجما" },
  { provider: "canva", slug: "canva", label: "كانفا" },
  { provider: "meta-ads", slug: "facebook_ads", label: "إعلانات ميتا" },
  { provider: "google-ads", slug: "google_ads", label: "إعلانات جوجل" },
  { provider: "google-business", slug: "google_my_business", label: "نشاطي على جوجل" },
];

const byProvider = new Map(pipedreamApps.map((a) => [a.provider, a]));

export function pipedreamApp(provider: string): PipedreamApp | undefined {
  return byProvider.get(provider);
}

/** المنصات التي يديرها Pipedream نيابة عنا. */
export function isPipedreamProvider(provider: string): boolean {
  return byProvider.has(provider);
}

/** إجراء محدد على منصة محددة (إن كان مدعوماً). */
export function pipedreamAction(
  provider: string,
  action: string,
): PipedreamAction | undefined {
  return byProvider.get(provider)?.actions?.[action];
}
