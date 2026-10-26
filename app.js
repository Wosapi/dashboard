(async function(){
"use strict";
const CATS=["Min","Syn","DEO","Fluids"],MN=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const f2=v=>v==null?"—":Number(v).toLocaleString("ar-SA",{maximumFractionDigits:2});
const pc=v=>v==null?"—":(v*100).toLocaleString("ar-SA",{maximumFractionDigits:1})+"٪";
let D;
try{D=await (await fetch("data/sales-data.json")).json()}catch(e){document.getElementById("meta").textContent="تعذّر تحميل data/sales-data.json";return}
// الشهر "مُبلَّغ" إذا كان مجموع الفعلي لكل الفئات > 0؛ غير ذلك يُعامل كغير مؤكد وليس صفرًا
const rep={};D.rows.forEach(r=>{const k=r.year+"-"+r.month;rep[k]=(rep[k]||0)+(r.actual||0)});
D.rows.forEach(r=>{r.reported=rep[r.year+"-"+r.month]>0&&r.actual!=null});
document.getElementById("meta").textContent="المصدر: "+D.source+" · وحدة القياس: "+D.unit+" · حتى "+D.asOf;
const $=id=>document.getElementById(id);
[...new Set(D.rows.map(r=>r.year))].forEach(y=>$("fYear").add(new Option(y,y)));
CATS.forEach(c=>$("fCat").add(new Option(c,c)));
$("fYear").value="2026";
const ch={};
function inPeriod(r,p){return p==="all"||(p[0]==="H"?r.half==+p[1]:r.quarter==+p[1])}
function sel(){const y=$("fYear").value,p=$("fPeriod").value,c=$("fCat").value;
 return D.rows.filter(r=>(y==="all"||r.year==y)&&inPeriod(r,p)&&(c==="all"||r.category===c))}
function agg(rows){const rr=rows.filter(r=>r.reported);const t=rr.reduce((s,r)=>s+(r.target||0),0),a=rr.reduce((s,r)=>s+r.actual,0);
 return{t,a,v:a-t,p:t>0?a/t:null,n:new Set(rr.map(r=>r.year+"-"+r.month)).size}}
function mk(id,type,data,opt){ch[id]&&ch[id].destroy();ch[id]=new Chart($(id),{type,data,options:Object.assign({responsive:true,maintainAspectRatio:false,plugins:{legend:{rtl:true,labels:{font:{family:"inherit"}}}}},opt||{})})}
function render(){
 const rows=sel(),A=agg(rows);
 $("kpis").innerHTML=[["المستهدف (أشهر مُبلَّغة)",f2(A.t)],["الفعلي",f2(A.a)],["الفارق عن المستهدف",f2(A.v),A.v>=0?"ok":"bad"],["نسبة التحقيق",pc(A.p),A.p==null?"":A.p>=1?"ok":"bad"],["عدد الأشهر المُبلَّغة",A.n]]
  .map(k=>`<div class="kpi"><span>${k[0]}</span><b class="${k[2]||""}">${k[1]}</b></div>`).join("");
 const y=$("fYear").value;
 const iss=D.issues.filter(i=>y==="all"||i.includes(y));
 $("alerts").innerHTML=iss.length?`<details open><summary>تنبيهات جودة البيانات (${iss.length})</summary><ul>${iss.map(i=>`<li>${i}</li>`).join("")}</ul></details>`:"";
 // monthly
 const ml=[],mt=[],ma=[];
 const ys=y==="all"?[...new Set(D.rows.map(r=>r.year))]:[+y];
 ys.forEach(yy=>{for(let m=1;m<=12;m++){const rr=rows.filter(r=>r.year===yy&&r.month===m);if(!rr.length)continue;
  ml.push((ys.length>1?yy+" ":"")+MN[m-1]);mt.push(rr.reduce((s,r)=>s+(r.target||0),0));
  ma.push(rr.some(r=>r.reported)?rr.reduce((s,r)=>s+(r.actual||0),0):null)}});
 mk("cMonthly","line",{labels:ml,datasets:[{label:"المستهدف",data:mt,borderColor:"#9aa6b4",borderDash:[5,4],tension:.2},{label:"الفعلي",data:ma,borderColor:"#c8102e",backgroundColor:"#c8102e",tension:.2,spanGaps:false}]});
 // years: same filters but all years
 const c=$("fCat").value,p=$("fPeriod").value;
 const yrs=[...new Set(D.rows.map(r=>r.year))];
 const ya=yrs.map(yy=>agg(D.rows.filter(r=>r.year===yy&&inPeriod(r,p)&&(c==="all"||r.category===c))));
 mk("cYears","bar",{labels:yrs,datasets:[{label:"المستهدف",data:ya.map(x=>x.t),backgroundColor:"#9aa6b4"},{label:"الفعلي",data:ya.map(x=>x.a),backgroundColor:"#c8102e"}]});
 // cats
 const ca=CATS.map(k=>agg(rows.filter(r=>r.category===k)));
 mk("cCats","bar",{labels:CATS,datasets:[{label:"المستهدف",data:ca.map(x=>x.t),backgroundColor:"#9aa6b4"},{label:"الفعلي",data:ca.map(x=>x.a),backgroundColor:"#c8102e"}]});
 // periods
 const per=["Q1","Q2","Q3","Q4","H1","H2"],base=D.rows.filter(r=>(y==="all"||r.year==y)&&(c==="all"||r.category===c));
 const pv=per.map(k=>{const a=agg(base.filter(r=>inPeriod(r,k)));return a.p==null?null:+(a.p*100).toFixed(1)});
 mk("cPeriods","bar",{labels:["ر1","ر2","ر3","ر4","ن1","ن2"],datasets:[{label:"نسبة التحقيق %",data:pv,backgroundColor:pv.map(v=>v==null?"#9aa6b4":v>=100?"#1a7f37":"#c8102e")}]});
 table(rows);
}
let sortK="year",sortD=1;
const COLS=[["year","السنة"],["monthName","الشهر"],["quarter","الربع"],["half","النصف"],["category","الفئة"],["target","المستهدف"],["actual","الفعلي"],["variance","الفارق"],["ach","التحقيق"],["status","الحالة"]];
function table(rows){
 const q=$("search").value.trim().toLowerCase();
 let T=rows.map(r=>({...r,variance:r.reported?r.actual-(r.target||0):null,ach:r.reported&&r.target>0?r.actual/r.target:null,status:r.reported?"مُبلَّغ":"غير مؤكد/فارغ"}));
 if(q)T=T.filter(r=>Object.values(r).join(" ").toLowerCase().includes(q));
 T.sort((a,b)=>{const x=a[sortK],y=b[sortK];if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*sortD||(a.month-b.month)});
 $("tbl").tHead.innerHTML="<tr>"+COLS.map(c=>`<th data-k="${c[0]}">${c[1]}</th>`).join("")+"</tr>";
 $("tbl").tBodies[0].innerHTML=T.map(r=>`<tr><td>${r.year}</td><td>${MN[r.month-1]}</td><td>${r.quarter}</td><td>${r.half}</td><td>${r.category}</td><td>${f2(r.target)}</td><td>${f2(r.actual)}</td><td class="${r.variance==null?"":r.variance>=0?"ok":"bad"}">${f2(r.variance)}</td><td class="${r.ach==null?"":r.ach>=1?"ok":"bad"}">${pc(r.ach)}</td><td>${r.status}</td></tr>`).join("");
 $("tbl").tHead.querySelectorAll("th").forEach(th=>th.onclick=()=>{const k=th.dataset.k;sortD=k===sortK?-sortD:1;sortK=k;render()});
}
["fYear","fPeriod","fCat"].forEach(id=>$(id).onchange=render);$("search").oninput=render;
render();
})();
