import { auditPage } from "@/lib/seo-research.server";
const urls = [
  "https://ar.wikipedia.org/wiki/عطر",
  "https://www.instagram.com/nasa/",
  "https://www.tiktok.com/@nasa",
  "https://www.facebook.com/NASA",
  "https://x.com/nasa",
  "https://www.youtube.com/@NASA",
  "https://www.amazon.sa/",
];
const r = await Promise.all(urls.map(async (u) => {
  const t = Date.now();
  try { const a = await auditPage(u); return { u, ok: true, secs:+((Date.now()-t)/1000).toFixed(1), words:a.wordCount, title:(a as any).title?.slice(0,60) }; }
  catch (e) { return { u, ok:false, secs:+((Date.now()-t)/1000).toFixed(1), err: e instanceof Error? e.message : String(e) }; }
}));
console.log(JSON.stringify(r,null,2));
process.exit(0);
