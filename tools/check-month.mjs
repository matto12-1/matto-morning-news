// tools/check-month.mjs — 한 달 치 발행분을 발행 전에 한꺼번에 잰다.
//   node tools/check-month.mjs 2026-11            (기사만)
//   node tools/check-month.mjs 2026-11 --images   (표지 파일까지)
// 실패가 하나라도 있으면 종료 코드 1.
//
// 2026-09-10 10월치 20편을 병렬로 쓰며 계통적으로 깨진 것들을 한 표로 본다 — 사람 눈으로는
// 안 보이고 수치로 재야 드러났다(DECISIONS 2026-09-10). archive.test.mjs 는 전 호에 걸리는
// 느슨한 불변식이고, 이 검사기는 새 배치에 거는 엄격한 기준이다(합쇼체 0, 밑줄 8, 중복 0).
import fs from "node:fs";
import { validateArticle } from "./validate.mjs";

const [month, ...flags] = process.argv.slice(2);
if (!/^\d{4}-\d{2}$/.test(month || "")) { console.error("사용법: node tools/check-month.mjs YYYY-MM [--images]"); process.exit(2); }
const needImages = flags.includes("--images");

const dir = new URL("../content/", import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.startsWith(month + "-") && /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) { console.error(`${month} 기사 파일이 없다`); process.exit(1); }

const LEN = { sprout: [380, 450], lower: [700, 1000], upper: [1300, 1500] };
const bodyText = (a, lv) => (a.body?.[lv] || []).map((s) => s.text).join(" ");
const sentences = (s) => s.split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
const count = (s) => s.replace(/\s/g, "").length;

let failed = 0;
const themes = {};
console.log("날짜        호   분량(s/l/u)        밑줄 합쇼 중복 문제");
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(new URL(f, dir), "utf8"));
  const e = [];
  themes[a.category] = (themes[a.category] || 0) + 1;

  const v = validateArticle(a);
  if (!v.ok) e.push("validate: " + v.errors.join("; "));

  const S = bodyText(a, "sprout"), L = bodyText(a, "lower"), U = bodyText(a, "upper");
  const lens = { sprout: count(S), lower: count(L), upper: count(U) };
  for (const [lv, [lo, hi]] of Object.entries(LEN)) if (lens[lv] < lo || lens[lv] > hi) e.push(`${lv} 분량 ${lens[lv]}자(${lo}~${hi})`);

  // 낱말 밑줄 — 앱은 vocab.word 가 본문에 글자 그대로 있어야 밑줄을 친다
  const words = (a.vocab || []).map((x) => x.word);
  const uHit = words.filter((w) => U.includes(w)).length;
  if (words.length !== 8) e.push(`vocab ${words.length}개(8개여야)`);
  if (uHit < 8) e.push(`고학년 밑줄 ${uHit}/8 — 없는 낱말: ${words.filter((w) => !U.includes(w)).join(",")}`);
  const miss4 = words.slice(0, 4).filter((w) => !L.includes(w));
  if (miss4.length) e.push(`앞 4낱말이 3·4학년 본문에 없음: ${miss4.join(",")}`);
  const leak = words.slice(4).filter((w) => L.includes(w) || S.includes(w));
  if (leak.length) e.push(`뒤 4낱말이 저학년에 샘: ${leak.join(",")}`);
  if (!words.some((w) => S.includes(w))) e.push("1·2학년 본문 밑줄 0개");

  // 문체 — '~습니다/~ㅂ니다'만 센다. '~랍니다/~답니다'는 이 신문의 이야기체라 정상이다
  const stiff = sentences([S, L, U].join(" ")).filter((x) => /니다[.?!]$/.test(x) && !/[답랍]니다[.?!]$/.test(x));
  if (stiff.length) e.push(`합쇼체 ${stiff.length}문장 — 예: ${stiff[0].slice(-30)}`);

  // 학년 간 같은 문장 — 학년별로 새로 쓰는 것이 원칙이다
  const long = (t) => sentences(t).filter((x) => x.length > 18);
  const Ss = new Set(long(S)), Ls = long(L), Us = long(U);
  const dup = [...new Set([...Ls.filter((x) => Ss.has(x)), ...Us.filter((x) => Ss.has(x) || Ls.includes(x))])];
  if (dup.length) e.push(`학년 간 같은 문장 ${dup.length}: ${dup[0].slice(0, 30)}…`);

  // 퀴즈 형식
  const c = a.quiz?.comprehension || {};
  const types = (arr) => (arr || []).map((q) => q.type).join(",");
  if (!/^(mc|ox)(,(mc|ox)){2,3}$/.test(types(c.sprout))) e.push(`1·2학년 퀴즈 유형 [${types(c.sprout)}]`);
  if (types(c.lower) !== "mc,ox,mc,ox,cloze") e.push(`3·4학년 퀴즈 유형 [${types(c.lower)}]`);
  if (types(c.upper) !== "mc,multi,ox,order,mc") e.push(`5·6학년 퀴즈 유형 [${types(c.upper)}]`);
  if (!a.factbox?.sprout) e.push("factbox.sprout 없음");
  if (!a.quiz?.think?.sprout) e.push("think.sprout 없음");

  // 빈칸 — 빈칸은 하나, 정답을 넣으면 같은 말이 겹치면 안 된다("다섯 줄 줄")
  const items = [...(c.sprout || []), ...(c.lower || []), ...(c.upper || []), ...(a.quiz?.vocab || [])];
  for (const q of items.filter((q) => q.type === "cloze")) {
    const blanks = (q.question.match(/_{2,}/g) || []).length;
    if (blanks !== 1) e.push(`빈칸 ${blanks}개: ${q.question.slice(0, 30)}`);
    for (const ans of q.acceptable || []) {
      const w = q.question.replace(/_{2,}/, ans).replace(/[.,'"()?!]/g, " ").split(/\s+/).filter(Boolean);
      if (w.some((x, i) => x === w[i + 1])) e.push(`빈칸 정답 "${ans}"을 넣으면 말이 겹침`);
    }
  }

  if (needImages && !fs.existsSync(new URL(`img/${a.date}.jpg`, dir))) e.push("표지 그림 없음");

  if (e.length) failed++;
  console.log(`${e.length ? "▲" : "✔"} ${a.date} #${String(a.issueNo).padEnd(3)} ${`${lens.sprout}/${lens.lower}/${lens.upper}`.padEnd(16)} ${uHit}/8  ${String(stiff.length).padStart(3)}  ${String(dup.length).padStart(3)}  ${e.length ? e.join(" | ") : ""}`);
}
console.log(`\n${files.length}편 · 계열 분포 ${Object.entries(themes).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(failed ? `어긋난 편: ${failed}` : "전부 통과");
process.exit(failed ? 1 : 0);
