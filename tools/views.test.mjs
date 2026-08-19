// 조회수: 탭 하나당 한 번만 센다는 규칙과 숫자 표기.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRpc, formatCount } from "../assets/views.js";

// sessionStorage 흉내. throws=true면 사파리 사생활 보호 모드처럼 던진다.
const fakeStore = ({ has = false, throws = false } = {}) => ({
  getItem: () => { if (throws) throw new Error("denied"); return has ? "1" : null; },
  setItem: () => { if (throws) throw new Error("denied"); },
});

test("처음 연 탭은 조회수를 올린다", () => {
  assert.equal(pickRpc(fakeStore()), "mn_bump_view");
});

test("이미 센 탭은 읽기만 한다", () => {
  assert.equal(pickRpc(fakeStore({ has: true })), "mn_get_views");
});

test("저장소를 못 쓰는 브라우저에서도 터지지 않는다", () => {
  // 사파리 사생활 보호 모드 등. 세지 못할 뿐 화면은 떠야 한다.
  assert.equal(pickRpc(fakeStore({ throws: true })), "mn_bump_view");
  assert.equal(pickRpc(undefined), "mn_bump_view");
  assert.equal(pickRpc(null), "mn_bump_view");
});

test("숫자에 천 단위 쉼표", () => {
  assert.equal(formatCount(1340), "1,340");
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(null), "0");       // 응답이 비어도 0으로
  assert.equal(formatCount(undefined), "0");
});
