// assets/content.js — 오늘 글 결정 + 로딩. 순수 함수는 Node 테스트 가능.
import { TIMEZONE_OFFSET_MIN } from "./config.js";

// 사용 가능한 날짜 배열에서 "오늘 이하 가장 최근" 글을 고른다(주말·미생성 폴백).
export function pickIssueDate(dates, todayISO) {
  const usable = [...dates].filter((d) => d <= todayISO).sort();
  return usable.length ? usable[usable.length - 1] : null;
}

// KST 기준 오늘 날짜(YYYY-MM-DD). Date.now()로 계산(브라우저에서 호출).
export function todayISO(offsetMin = TIMEZONE_OFFSET_MIN, now = Date.now()) {
  return new Date(now + offsetMin * 60000).toISOString().slice(0, 10);
}

export async function loadIndex() {
  const r = await fetch("content/index.json");
  if (!r.ok) throw new Error("index.json을 불러올 수 없어요");
  return r.json();
}

export async function loadArticle(date) {
  const r = await fetch(`content/${date}.json`);
  if (!r.ok) throw new Error("기사를 찾을 수 없어요");
  return r.json();
}

// 지난 호 목록(아카이브용). topics.json의 발행 이력.
export async function loadManifest() {
  const r = await fetch("content/topics.json");
  if (!r.ok) throw new Error("지난 호 목록을 불러올 수 없어요");
  const j = await r.json();
  return Array.isArray(j.published) ? j.published : [];
}
