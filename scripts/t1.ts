import { serpSearch, contentBrief, competitorInventory } from "@/lib/seo-research.server";
const s = await serpSearch("أفضل شركات تأمين في السعودية");
console.log("serp", s.length, JSON.stringify(s.slice(0,3)));
const b = await contentBrief("أفضل بطاقات ائتمان في مصر");
console.log("brief", JSON.stringify(b).slice(0,900));
const c = await competitorInventory("almowafir.com");
console.log("comp", JSON.stringify(c).slice(0,600));
process.exit(0);
