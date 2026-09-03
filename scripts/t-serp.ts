import { serpSearch, competitorInventory } from "@/lib/seo-research.server";
const qs=["أفضل شركات شحن في الإمارات","تكلفة تصميم موقع الكتروني في مصر","افضل جامعات هندسة في الاردن","اسعار تذاكر الطيران الى تركيا","حاسبة الضريبة المضافة السعودية"];
const t=Date.now();
const r=await Promise.all(qs.map(async q=>{const s=Date.now();const v=await serpSearch(q);return {q,n:v.length,secs:+((Date.now()-s)/1000).toFixed(1),first:v[0]?.url}}));
const inv=await competitorInventory("almowafir.com");
console.log(JSON.stringify({total:+((Date.now()-t)/1000).toFixed(1),r,inv:{urls:inv.urlCount}},null,1));
process.exit(0);
