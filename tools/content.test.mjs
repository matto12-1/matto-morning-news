import { test } from "node:test";
import assert from "node:assert/strict";
import { pickIssueDate, todayISO, readLevel, saveLevel } from "../assets/content.js";

test("exact today match", () => {
  assert.equal(pickIssueDate(["2026-07-20", "2026-07-21"], "2026-07-21"), "2026-07-21");
});

test("fallback to latest before today", () => {
  assert.equal(pickIssueDate(["2026-07-19", "2026-07-20"], "2026-07-21"), "2026-07-20");
});

test("ignores future issues", () => {
  assert.equal(pickIssueDate(["2026-07-19", "2026-07-30"], "2026-07-21"), "2026-07-19");
});

test("no past issue returns null", () => {
  assert.equal(pickIssueDate(["2026-07-25"], "2026-07-21"), null);
});

test("todayISO applies KST offset", () => {
  // 2026-07-20T20:00:00Z + 9h = 2026-07-21 05:00 KST
  const now = Date.parse("2026-07-20T20:00:00Z");
  assert.equal(todayISO(9 * 60, now), "2026-07-21");
});

// ── 마지막에 고른 학년 기억 ──
// localStorage 흉내. throws=true면 사파리 사생활 보호 모드처럼 던진다.
const fakeStore = (value = null, { throws = false } = {}) => {
  let v = value;
  return {
    getItem: () => { if (throws) throw new Error("denied"); return v; },
    setItem: (_k, x) => { if (throws) throw new Error("denied"); v = x; },
    get value() { return v; },
  };
};

test("고른 학년을 기억했다가 다음에 그대로 연다", () => {
  const store = fakeStore();
  saveLevel("upper", store);
  assert.equal(readLevel(store), "upper");
  saveLevel("sprout", store);
  assert.equal(readLevel(store), "sprout");
});

test("고른 적이 없으면 3·4학년으로 연다", () => {
  assert.equal(readLevel(fakeStore()), "lower");
});

test("저장소에 낯선 값이 들어있어도 기본 학년으로 연다", () => {
  assert.equal(readLevel(fakeStore("6학년")), "lower");
  saveLevel("중2", fakeStore());                 // 없는 단계는 저장하지 않는다
  assert.equal(readLevel(fakeStore("중2")), "lower");
});

test("저장소를 못 쓰는 브라우저에서도 터지지 않는다", () => {
  assert.equal(readLevel(fakeStore("upper", { throws: true })), "lower");
  assert.equal(readLevel(undefined), "lower");
  assert.doesNotThrow(() => saveLevel("upper", fakeStore(null, { throws: true })));
  assert.doesNotThrow(() => saveLevel("upper", undefined));
});

test("localStorage 접근 자체가 막힌 브라우저에서도 신문은 뜬다", () => {
  // 쿠키·사이트 데이터 전면 차단: window.localStorage를 읽는 것만으로 던진다.
  const orig = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { const e = new Error("blocked"); e.name = "SecurityError"; throw e; },
  });
  try {
    assert.equal(readLevel(), "lower");                 // 던지지 않고 기본 학년
    assert.doesNotThrow(() => saveLevel("upper"));      // 저장 실패는 조용히
  } finally {
    if (orig) Object.defineProperty(globalThis, "localStorage", orig);
    else delete globalThis.localStorage;
  }
});
