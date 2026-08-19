// tools/check-print-fit.mjs — 인쇄 학습지가 A4 한 면에 들어가는지 전 호 검사.
//
// 인쇄 조판은 Node 테스트로 잴 수 없어(브라우저 렌더가 필요) 별도 도구로 둔다.
// print.css의 글자 크기·여백·단 수를 건드렸거나 기사 분량 기준을 바꿨으면 반드시 돌릴 것.
//   node tools/check-print-fit.mjs        (= npm run check:print)
//
// 5·6학년 문제면은 문항이 13개(내용 이해 5 + 낱말 8)라 한 면에 들어가지 않는다.
// 50호 전수로 확인한 사실이므로 검사 대상에서 뺐다. 나머지는 전부 한 면이어야 한다.
// 실패하면 종료 코드 1.
import { buildWorksheetHtml } from "../assets/print.js";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const cwd = process.cwd().split("\\").join("/");
const AVAIL = 274;
const dates = readdirSync(new URL("../content/", import.meta.url)).filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).map((f) => f.slice(0, 10)).sort();
// 한 면에 들어가야 하는 조합. (5·6학년 문제는 두 면 허용)
const MUST = [["sprout","body"],["sprout","quiz"],["lower","body"],["lower","quiz"],["upper","body"]];
let probes = "";
for (const d of dates) {
  const a = JSON.parse(readFileSync(new URL(`../content/${d}.json`, import.meta.url), "utf8"));
  for (const [lv, part] of MUST) {
    const html = buildWorksheetHtml(a, lv, "student", { body: part === "body", quiz: part === "quiz" });
    probes += `<div class="probe" data-n="${d} ${lv} ${part}">${html}</div>`;
  }
}
writeFileSync(new URL("./_fit.html", import.meta.url), `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fastly.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap">
<link rel="stylesheet" href="../assets/print.css">
<style>body{margin:0;width:182mm}#print-root{display:block!important}</style></head>
<body class="printing"><div id="print-root">${probes}</div>
<script>window.addEventListener("load",()=>{setTimeout(()=>{
 document.title=[...document.querySelectorAll(".probe")].map(p=>p.dataset.n+"="+Math.round(p.querySelector(".page").getBoundingClientRect().height/3.7795)).join("|");
},1500)});<\/script></body></html>`);
const dom = execFileSync(CHROME, ["--headless","--disable-gpu","--virtual-time-budget=12000","--dump-dom",`file:///${cwd}/tools/_fit.html`], { encoding: "utf8", maxBuffer: 1<<29 });
const t = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
const over = [], worst = {};
for (const part of t.split("|")) {
  const [n, mm] = part.split("=");
  const [d, lv, kind] = n.split(" ");
  const h = Number(mm);
  const key = `${lv} ${kind}`;
  if (!worst[key] || h > worst[key].h) worst[key] = { h, d };
  if (h > AVAIL) over.push(`${n} = ${h}mm (${h - AVAIL} 초과)`);
}
console.log(`검사 ${t.split("|").length}건 / 한 면 가용 ${AVAIL}mm`);
for (const k of Object.keys(worst)) console.log(`  최악 ${k.padEnd(12)} ${worst[k].h}mm  (${worst[k].d})`);
console.log(over.length ? "\n한 면을 넘긴 것:\n" + over.join("\n") : "\n전부 한 면에 들어감 ✅");
