import { serpSearch, competitorInventory } from "@/lib/seo-research.server";
const qs=["أفضل عطور عربية رجالية","عطور عربية رجالية السعودية","أفضل شركات تأمين في السعودية","أسعار الذهب اليوم مصر","best arabic perfume brands"];
const t=Date.now();
const r=await Promise.all(qs.map(async q=>{const s=Date.now();const v=await serpSearch(q);return {q,n:v.length,secs:+((Date.now()-s)/1000).toFixed(1),first:v[0]?.url}}));
const inv=await competitorInventory("almowafir.com");
console.log(JSON.stringify({total:+((Date.now()-t)/1000).toFixed(1),r,inv:{urls:inv.urlCount}},null,1));
process.exit(0);
