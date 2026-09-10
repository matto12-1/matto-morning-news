// tools/archive.test.mjs — 아카이브 정합 검사(실제 content/ 를 그대로 읽는다).
//
// 2026-09-09: 10월치를 준비하다 topics.json의 nextIndex가 실제 발행 이력과 어긋나 있는 것을
// 발견했다(마지막 발행은 rotation[14]인데 포인터는 22 — 그대로 뒀으면 대주제 7개를 통째로
// 건너뛸 뻔했다). 사람 눈으로는 안 보이는 종류의 어긋남이라 검사로 고정한다.
//
// 포인터 대조는 **대주제 이름이 아니라 published[].slot(그 편이 쓴 rotation 인덱스)** 으로 한다.
// 이름으로 대조하면 큐를 재편해 이름이 바뀔 때마다 검사가 깨진다. slot은 51호부터 기록한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
const index = read("../content/index.json");
const topics = read("../content/topics.json");
const domains = read("../content/domains.json");

test("index.json 과 실제 기사 파일이 일치한다", () => {
  const files = fs.readdirSync(new URL("../content", import.meta.url))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(".json", ""))
    .sort();
  assert.deepEqual([...index].sort(), files);
});

test("index.json 은 날짜 오름차순이고 중복이 없다", () => {
  assert.deepEqual(index, [...index].sort());
  assert.equal(new Set(index).size, index.length);
});

test("issueNo 가 1부터 빠짐없이 이어진다", () => {
  const nos = index.map((d) => read(`../content/${d}.json`).issueNo);
  assert.deepEqual(nos, index.map((_, i) => i + 1));
});

test("발행 이력(topics.published)이 index 와 같은 날짜를 같은 순서로 담는다", () => {
  assert.deepEqual(topics.published.map((p) => p.date), index);
});

test("모든 대주제가 순환 큐(rotation) 안에 있다", () => {
  const known = new Set(domains.rotation.map((r) => r.domain));
  // 큐 재편(2026-09-09) 전에 쓰던 이름은 이력에만 남아 있어도 된다 — slot 이 있는 편만 검사한다.
  const stale = topics.published.filter((p) => p.slot != null && !known.has(p.badgeLabel || p.domain));
  assert.deepEqual(stale.map((p) => p.date), []);
});

test("slot 이 가리키는 대주제가 실제로 쓴 대주제와 같다", () => {
  for (const p of topics.published) {
    if (p.slot == null) continue;
    assert.equal(domains.rotation[p.slot]?.domain, p.badgeLabel || p.domain, `${p.date} slot ${p.slot}`);
  }
});

test("nextIndex 가 마지막으로 쓴 slot 의 바로 다음을 가리킨다", () => {
  const withSlot = topics.published.filter((p) => p.slot != null);
  assert.ok(Number.isInteger(topics.nextIndex));
  assert.ok(topics.nextIndex >= 0 && topics.nextIndex < domains.rotation.length, "nextIndex 범위 밖");
  if (withSlot.length === 0) return; // slot 기록 이전(1~50호)만 있는 상태
  const last = withSlot[withSlot.length - 1];
  assert.equal(topics.nextIndex, (last.slot + 1) % domains.rotation.length);
});

// ── 원고 품질 불변식 (2026-09-10 10월치 검수에서 병렬 집필이 계통적으로 깨뜨린 것들) ──
// 셋 다 사람 눈으로는 안 보이고 수치로 재야 드러났다. 나이틀리 잡이 다시 흘리면 여기서 걸린다.
const articles = index.map((d) => read(`../content/${d}.json`));
const bodyText = (a, lv) => (a.body?.[lv] || []).map((s) => s.text).join(" ");
const sentences = (s) => s.split(/(?<=[.?!])\s+/).map((x) => x.trim());

test("고학년 본문에 낱말 밑줄이 7개 이상 뜬다", () => {
  // 앱은 본문에 vocab.word 가 글자 그대로 있어야만 밑줄·팝업·선긋기 문제를 만든다.
  // 기존 50편은 평균 7.9개였는데 병렬 집필분이 평균 6.6개로 떨어졌었다.
  const weak = articles
    .filter((a) => a.body?.upper)
    .map((a) => [a.date, a.vocab.filter((v) => bodyText(a, "upper").includes(v.word)).length])
    .filter(([, n]) => n < 7);
  assert.deepEqual(weak, []);
});

test("본문 문체가 해요체를 벗어나지 않는다 (딱딱한 합쇼체는 편당 5문장 이하)", () => {
  // '~습니다/~ㅂ니다' 서술만 센다. '~랍니다/~답니다'는 이 신문의 이야기체라 세지 않는다
  // (기존 50편에 815번 — 이것까지 세면 안 된다. 실제로 한 번 잘못 셌다).
  // 기존 50편은 편당 0~4건이었고, 병렬 집필분은 편당 최대 33건이었다.
  const stiff = articles
    .map((a) => [a.date, sentences(["sprout", "lower", "upper"].map((lv) => bodyText(a, lv)).join(" "))
      .filter((x) => /니다[.?!]$/.test(x) && !/[답랍]니다[.?!]$/.test(x)).length])
    .filter(([, n]) => n > 5);
  assert.deepEqual(stiff, []);
});

test("빈칸 문제의 정답을 빈칸에 넣으면 같은 말이 겹치지 않는다", () => {
  // "하루 ___ 줄" 에 "다섯 줄"을 정답으로 받으면 "다섯 줄 줄"이 된다 — 아이가 틀린 형태를
  // 써도 정답 처리된다. 기존 3개 호와 10월 3개 호에서 같은 모양으로 나왔다.
  const bad = [];
  for (const a of articles) {
    const c = a.quiz.comprehension;
    const items = [...(Array.isArray(c) ? c : []), ...(c.sprout || []), ...(c.lower || []), ...(c.upper || []), ...(a.quiz.vocab || [])];
    for (const q of items.filter((q) => q.type === "cloze")) {
      for (const ans of q.acceptable || []) {
        const w = q.question.replace(/_{2,}/, ans).replace(/[.,'"()?!]/g, " ").split(/\s+/).filter(Boolean);
        if (w.some((x, i) => x === w[i + 1])) bad.push(`${a.date} "${ans}"`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("순환 큐는 8계열이 고르게 섞여 있다", () => {
  const order = domains._order;
  assert.equal(order.length, 8);
  assert.equal(domains.rotation.length % order.length, 0, "rotation 길이가 계열 수의 배수가 아니다");
  // 연속한 8칸이 8계열 하나씩 — 어느 2주를 잘라도 편중되지 않게 하는 불변식.
  for (let i = 0; i + order.length <= domains.rotation.length; i += order.length) {
    const themes = domains.rotation.slice(i, i + order.length).map((r) => r.theme);
    assert.deepEqual(themes, order, `rotation[${i}..${i + order.length - 1}] 계열 순서가 어긋남`);
  }
});
