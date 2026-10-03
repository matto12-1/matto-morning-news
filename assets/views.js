// assets/views.js — 조회수. 탭(세션) 하나당 한 번만 센다.
// 조회수를 못 가져와도 신문은 그대로 떠야 한다. 실패는 전부 조용히 삼킨다.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const MARK = "mn-counted";

// sessionStorage는 사파리 사생활 보호 모드 등에서 던질 수 있다.
// 읽기가 실패하면 '아직 안 셈'으로 보고 넘어간다(최악이라도 숫자가 조금 부풀 뿐).
const marked = (store) => { try { return !!store?.getItem(MARK); } catch { return false; } };
// 접근 자체가 던지는 브라우저가 있다. 못 쓰면 없는 셈 친다.
const safeStore = (s) => { try { return s ?? globalThis.sessionStorage; } catch { return null; } };
const mark = (store) => { try { store?.setItem(MARK, "1"); } catch { /* 무시 */ } };

// 이 탭이 이미 셌으면 읽기만, 아니면 +1. 순수 함수라 테스트로 잡는다.
export const pickRpc = (store) => (marked(store) ? "mn_get_views" : "mn_bump_view");

export const formatCount = (n) => Number(n || 0).toLocaleString("ko-KR");

// 기본 인자로 sessionStorage를 집으면 전면 차단 브라우저에서 여기서 바로 던진다
// (mountViews는 render()에서 try 없이 불린다 → 신문이 통째로 안 뜬다).
export async function fetchViews(storage) {
  const store = safeStore(storage);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${pickRpc(store)}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`조회수 조회 실패 (${res.status})`);
  const [row] = await res.json();
  mark(store);
  return { today: Number(row?.today ?? 0), total: Number(row?.total ?? 0) };
}

// 한 번 부른 결과를 재사용한다. 학년 토글처럼 화면을 다시 그릴 때마다
// 네트워크를 다시 타지 않게(그리고 두 번 세지 않게) 하기 위함.
let pending;

export function mountViews(root) {
  const el = root.querySelector(".views");
  if (!el) return;
  pending ??= fetchViews();
  pending
    .then(({ today, total }) => {
      // 숫자만 형광펜(--hi)으로 칠한다. 본문 낱말(.vocab)과 같은 문법.
      // formatCount는 Number를 통과시킨 문자열이라 innerHTML에 넣어도 안전하다.
      el.innerHTML =
        `오늘 <span class="n">${formatCount(today)}</span>명이 읽었어요` +
        ` · 지금까지 <span class="n">${formatCount(total)}</span>명`;
      el.hidden = false;
    })
    .catch(() => { /* 조회수는 못 보여도 신문은 뜬다 */ });
}
