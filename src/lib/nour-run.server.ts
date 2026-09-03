/**
 * نواة تشغيل الموظفين على الخادم: الشخصيات، جمع الأدلة الحقيقية، وتنفيذ قدرة كاملة.
 * تُستخدم من دالة الخادم `runSkill` (بطلب المستخدم) ومن الجدولة التلقائية (cron)
 * بنفس المنطق تماماً حتى تكون مخرجات نور متطابقة في الحالتين.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { getSkill } from "@/data/skills";
import { freeChat, gatherEvidence, planResearch } from "./nour-research.server";
import { withBudget } from "./seo-research.server";
import { memoryBlock } from "./memory.server";

export type Client = SupabaseClient<Database>;

/** الموظفون الذين يعتمدون على بحث حقيقي قبل الإجابة. */
export const RESEARCH_EMPLOYEES = new Set(["nour"]);

/** القدرات التحريرية/البصرية التي تستحق صورة رئيسية تلقائية مع المخرج. */
export const ARTICLE_SKILLS = new Set([
  "seo-article",
  "landing-copy",
  "comparison-page",
  "publish-package",
  "repurpose",
  "content-refresh",
  // سِراج — كل مخرج بصري يخرج ومعه صورة جاهزة للنشر
  "social-post",
  "post-visual",
  "carousel",
  "reel-script",
  "launch-campaign",
  "weekly-batch",
  "ugc-testimonial",
]);


export const evidenceRules = [
  "استخدم كتلة «أدلة ميدانية» أدناه كمصدر وحيد للأرقام والمنافسين والكلمات — لا تخترع بيانات غيرها.",
  "اذكر مصدر كل رقم مهم (Search Console، اقتراحات البحث، نتائج البحث، تحليل الصفحة).",
  "إن كانت الأدلة ناقصة، قل ذلك صراحة واقترح ما يلزم لجمعها.",
].join("\n");

export const personas: Record<
  string,
  { name: string; role: string; channel: string; kind: string }
> = {
  sonny: {
    name: "سِراج",
    role: [
      "مدير سوشيال ميديا عربي بخبرة 10 أعوام في الخليج ومصر والشام، أدار حسابات علامات تجزئة ومطاعم وعيادات ومتاجر إلكترونية.",
      "تملك المنظومة كاملة: استخراج صوت العلامة وأسلوبها البصري، بناء أعمدة المحتوى، تقويم شهري مجدول بالأوقات،",
      "كتابة المنشورات والكاروسيل وسكربتات الريلز والقصص، توليد الصور على هوية العلامة، إدارة التعليقات والرسائل،",
      "رادار الترند وفجوات المنافسين، حملات الإطلاق، إعادة استخدام المحتوى عبر المنصات، وقراءة الأرقام لإعادة ضبط الخطة.",
      "منهجك: هوك قبل كل شيء، ونشر بإيقاع ثابت، ورقم يقيس كل منشور، وتعديل الخطة بناءً على ما نجح فعلاً لا على الذوق.",
      "تكتب عربية طبيعية باللهجة المطلوبة، وتحترم حدود كل منصة، ولا تختلق أرقاماً ولا شهادات عملاء ولا ادعاءات.",
    ].join(" "),
    channel: "instagram",
    kind: "منشور",
  },

  eva: {
    name: "أمَل",
    role: "المساعدة التنفيذية — تفرز البريد، ترتّب المواعيد، وتكتب الردود.",
    channel: "gmail",
    kind: "رد بريد",
  },
  sam: {
    name: "سالم",
    role: "مسؤول المبيعات — يبحث عن العملاء المحتملين ويكتب تسلسلات التواصل.",
    channel: "linkedin",
    kind: "رسالة تواصل",
  },
  nour: {
    name: "نور",
    role: [
      "استراتيجية محتوى وسيو عربي بخبرة 12 عاماً في أسواق الخليج ومصر والشام.",
      "تملك المنظومة كاملة: بحث الكلمات وتجميعها دلالياً، تحليل نتائج البحث وفجوة المنافسين، الخرائط الموضوعية،",
      "كتابة المقالات وصفحات الهبوط وصفحات المقارنة والسيو البرمجي، الروابط الداخلية والبيانات المنظمة،",
      "التدقيق التقني العربي (RTL و hreflang والخطوط والفهرسة)، كشف تعارض الصفحات ورادار تراجع المحتوى،",
      "رفع نسبة النقر من بيانات Search Console، الظهور في مساعدات الذكاء الاصطناعي (GEO/AEO)، والسيو المحلي وخرائط جوجل.",
      "منهجك: قرار قبل كتابة، ودليل قبل ادعاء، ورقم يقيس كل مخرج.",
      "تكتب عربية بشرية بلا حشو ولا ترجمة آلية، وتطبّع الرسم العربي (أ/إ/ا، ة/ه، ي/ى) وتفرّق بين الفصحى المكتوبة واللهجة المبحوث بها.",
      "لا تخترع أرقاماً ولا مصادر ولا بيانات ترتيب؛ إن غابت البيانات صرّحت بأن التقدير مبني على أنماط القطاع.",
    ].join(" "),
    channel: "wordpress",
    kind: "مقال",
  },
  dana: {
    name: "دانة",
    role: "المصممة — أفكار بصرية ونصوص إعلانية للتصاميم.",
    channel: "canva",
    kind: "تصميم",
  },
  adam: {
    name: "آدم",
    role: "محلل البيانات — تقارير أداء وتوصيات رقمية.",
    channel: "analytics",
    kind: "تقرير",
  },
};

/** يجمع أدلة حقيقية مجانية (اقتراحات بحث، نتائج SERP، تحليل صفحات، Search Console، GA4). */
export async function researchFor(
  employeeId: string,
  apiKey: string,
  brand: { name: string; industry: string },
  message: string,
  workspaceId: string,
  /** سقف زمني صارم لجمع الأدلة: بعده تُجيب نور بما توفّر بدل تعليق الرد. */
  budgetMs = 25_000,
): Promise<{ block: string; used: string[] }> {
  if (!RESEARCH_EMPLOYEES.has(employeeId)) return { block: "", used: [] };
  if (!needsResearch(message)) return { block: "", used: [] };
  try {
    const plan = await planResearch(apiKey, brand, message);
    if (
      !plan.keywords?.length &&
      !plan.searches?.length &&
      !plan.urls?.length &&
      !plan.useSearchConsole
    ) {
      return { block: "", used: [] };
    }
    const evidence = await withBudget(gatherEvidence(plan, workspaceId), budgetMs, {
      block: "",
      sources: [] as string[],
      used: [] as string[],
    });
    return { block: evidence.block, used: evidence.used };
  } catch (error) {
    console.error("[nour] research failed:", error);
    return { block: "", used: [] };
  }
}

/** محادثة قصيرة/تحية لا تحتاج بحثاً ميدانياً — نرد فوراً. */
function needsResearch(message: string): boolean {
  const text = message.trim();
  if (text.length < 25) return false;
  const signals = [
    "كلمات", "كلمة", "سيو", "seo", "ترتيب", "منافس", "بحث", "مقال", "محتوى", "صفحة",
    "رابط", "http", "نقرات", "ظهور", "search console", "خطة", "استراتيج", "تحليل",
    "موقع", "مدونة", "شهري", "تقرير", "فرص", "عنوان", "ميتا", "schema",
  ];
  const lower = text.toLowerCase();
  return signals.some((s) => lower.includes(s));
}

/**
 * تشذيب المقدمات والمجاملات («أهلاً بك»، «بصفتي…»، «يسعدني أن أقدم…»)
 * حتى يبدأ كل مخرج بالمحتوى القابل للاستخدام مباشرة.
 */
export function stripPreamble(text: string): string {
  const lines = text.split("\n");
  const greeting =
    /^(أهلاً|أهلا|مرحباً|مرحبا|بالتأكيد|تفضل|تفضلي|حسناً|حسنا|بصفتي|يسعدني|سعيدة|إليك|اليك|فيما يلي|بناءً على طلبك|بناء على طلبك)/;
  while (lines.length) {
    const first = (lines[0] ?? "").trim();
    if (!first) {
      lines.shift();
      continue;
    }
    if (/^[#|!>\-*\d]/.test(first)) break;
    if (greeting.test(first) && first.length < 400) {
      lines.shift();
      continue;
    }
    break;
  }
  return lines.join("\n").trim();
}


export type SkillRun = {
  output: string;
  messageId: string | null;
  taskId: string | null;
  title: string;
  channel: string;
};

/**
 * تنفيذ قدرة محددة كاملة: بحث حقيقي → مخرج نهائي → رسالة في المحادثة → مهمة بانتظار الاعتماد.
 * يعمل مع عميل المستخدم (RLS) أو عميل الخادم (cron) بنفس السلوك.
 */
export async function executeSkill(
  client: Client,
  params: {
    workspaceId: string;
    employeeId: string;
    skillId: string;
    values: Record<string, string>;
    /** يُضاف إلى عنوان المهمة للتمييز بين التشغيل اليدوي والمجدول. */
    origin?: string;
  },
): Promise<SkillRun> {
  // المفاتيح تُقرأ داخل freeChat من جدول app_secrets في Supabase.
  const apiKey = "";


  const persona = personas[params.employeeId];
  const skill = getSkill(params.skillId);
  if (!persona || !skill || skill.employeeId !== params.employeeId)
    throw new Error("قدرة غير معروفة لهذا الموظف.");

  const [{ data: workspace }, { data: brain }] = await Promise.all([
    client.from("workspaces").select("*").eq("id", params.workspaceId).maybeSingle(),
    client.from("brain_items").select("title, body, kind").eq("workspace_id", params.workspaceId),
  ]);
  if (!workspace) throw new Error("مساحة العمل غير موجودة.");

  // نكمل القيم الناقصة من تعريف الحقول (defaultValue أو أول خيار) حتى لا يظهر "undefined"
  // في أي مخرج عند التشغيل التلقائي أو الاستدعاء من المحادثة.
  const values: Record<string, string> = {};
  for (const field of skill.fields) {
    const provided = params.values[field.name];
    values[field.name] =
      (provided?.trim() ? provided : undefined) ??
      field.defaultValue ??
      field.options?.[0] ??
      "";
  }
  for (const [key, value] of Object.entries(params.values)) {
    if (value?.trim() && !(key in values)) values[key] = value;
  }
  const missing = skill.fields.filter((f) => f.required && !values[f.name]?.trim()).map((f) => f.label);
  if (missing.length) throw new Error(`بيانات ناقصة لهذه القدرة: ${missing.join("، ")}.`);

  const prompt = skill.buildPrompt(values);

  const requestSummary = Object.entries(values)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v.length > 120 ? `${v.slice(0, 120)}…` : v}`)
    .join(" · ");


  const brainText = memoryBlock(brain ?? [], `${skill.title} ${requestSummary}`, 8);

  const research = await researchFor(
    params.employeeId,
    apiKey,
    { name: workspace.name, industry: workspace.industry },
    `${skill.title}\n${requestSummary}`,
    params.workspaceId,
  );

  // سياق حيّ من حسابات العلامة المربوطة (بريد، تقويم، CRM…) عبر Pipedream.
  let live = { block: "", used: [] as string[] };
  try {
    const { liveContextFor } = await import("./pipedream-tools.server");
    live = await liveContextFor(
      client as unknown as Parameters<typeof liveContextFor>[0],
      params.employeeId,
      params.workspaceId,
    );
  } catch (error) {
    console.error("[live] context failed:", error);
  }


  const today = new Date();
  const todayAr = today.toLocaleDateString("ar-EG", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const system = [
    `أنت ${persona.name}، ${persona.role}`,
    `تعمل داخل منصة «سهل» لصالح العلامة: ${workspace.name} (${workspace.industry}).`,
    `نبرة العلامة: ${workspace.tone}.`,
    `تاريخ اليوم: ${todayAr} (${today.toISOString().slice(0, 10)}). استخدم هذا التاريخ في أي جدول زمني أو تقويم أو إشارة زمنية، ولا تفترض سنة أقدم.`,
    workspace.banned_words?.length
      ? `كلمات ممنوعة تماماً: ${workspace.banned_words.join("، ")}.`
      : "",
    brainText ? `معرفة العلامة:\n${brainText}` : "",
    research.block ? `${evidenceRules}\n\n## أدلة ميدانية (لحظية)\n${research.block}` : "",
    live.block
      ? `## بيانات حسابات العلامة (حيّة الآن)\n${live.block}\n\nاعتمد على هذه البيانات الحقيقية في القرارات والأولويات والأسماء والمواعيد، ولا تخترع غيرها.`
      : "",

    "أنت تنفّذ الآن مهمة محددة وتسلّم مخرجاً نهائياً جاهزاً للاستخدام — لا أسئلة ولا مقدمات ولا اعتذارات.",
    "اكتب بالعربية الفصحى الواضحة، بصيغة Markdown منسّقة، والتزم حرفياً بالهيكل المطلوب.",
  ]
    .filter(Boolean)
    .join("\n");


  await client.from("messages").insert({
    workspace_id: params.workspaceId,
    employee_id: params.employeeId,
    role: "user",
    body: `▸ ${skill.title}${params.origin ? ` (${params.origin})` : ""}${requestSummary ? `\n${requestSummary}` : ""}`,
  });

  let output = (
    await freeChat(
      apiKey,
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { timeoutMs: 55_000, maxTokens: 3200 },
    )
  ).trim();

  if (!output) throw new Error("لم يصل مخرج من الموظف — أعد المحاولة.");

  // إزالة المجاملات الافتتاحية («أهلاً بك… بصفتي…») حتى يبدأ المخرج بالمحتوى مباشرة.
  output = stripPreamble(output);


  // صورة رئيسية مجانية لكل مخرج تحريري (مقال/صفحة/حزمة نشر) — مثل Penny وأدق منها:
  // نستخدم مزوّداً بلا مفتاح وبلا حد يومي، والرابط دائم صالح للنشر مباشرة.
  if (ARTICLE_SKILLS.has(skill.id)) {
    try {
      const { ownedHeroImage, heroPrompt } = await import("./image-gen.server");
      const subjectForImage =
        values["topic"] ||
        values["keyword"] ||
        values["product"] ||
        values["business"] ||
        values["goal"] ||
        skill.title;
      const alt = `${subjectForImage}`.slice(0, 120);
      const hero = await ownedHeroImage(
        client as unknown as Parameters<typeof ownedHeroImage>[0],
        params.workspaceId,
        heroPrompt(subjectForImage, workspace.industry),
      );
      const lines = output.split("\n");
      const at = lines[0]?.startsWith("#") ? 1 : 0;
      lines.splice(at, 0, "", `![${alt}](${hero})`, "");
      output = lines.join("\n");
    } catch (error) {
      console.error("[nour] hero image failed:", error);
    }
  }

  const sources = [...research.used, ...live.used];
  if (sources.length) {
    output = `${output}\n\n> مصادر البيانات: ${sources.join(" · ")}`;
  }



  const { data: assistantRow, error: assistantError } = await client
    .from("messages")
    .insert({
      workspace_id: params.workspaceId,
      employee_id: params.employeeId,
      role: "assistant",
      body: output,
    })
    .select("id")
    .single();
  if (assistantError) throw new Error(assistantError.message);

  const subject =
    params.values["keyword"] ||
    params.values["topic"] ||
    params.values["business"] ||
    params.values["product"] ||
    "";
  const title = `${skill.title}${subject ? ` — ${subject}` : ""}${params.origin ? ` · ${params.origin}` : ""}`;

  const { data: task } = await client
    .from("tasks")
    .insert({
      workspace_id: params.workspaceId,
      employee_id: params.employeeId,
      title,
      detail: requestSummary.slice(0, 400),
      kind: skill.kind,
      channel: skill.channel,
      status: "review",
      output,
      scheduled: "بانتظار اعتمادك",
      steps: [
        { label: "فهم الطلب", state: "done" },
        { label: "التنفيذ", state: "done" },
        { label: "مراجعتك", state: "active" },
        { label: "النشر", state: "todo" },
      ],
    })
    .select("id")
    .single();

  return {
    output,
    messageId: assistantRow?.id ?? null,
    taskId: task?.id ?? null,
    title,
    channel: skill.channel,
  };
}
