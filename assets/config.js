// assets/config.js — 서비스 전역 상수. 이름 확정 시 SITE_NAME만 변경.
export const SITE_NAME = "마또의 아침신문";
export const SITE_TAGLINE = "매일 아침, 한 편의 글과 함께";

// 제품 목록·연락처·태그라인은 공용 저장소로 갔다: assets/brand/products.js
// (원본은 f:/VibeCoding/mattolab-brand/products.js)
export const TIMEZONE_OFFSET_MIN = 9 * 60; // KST(UTC+9)

// 난이도 라벨. sprout(1·2학년)은 기사에 body.sprout이 있을 때만 노출되는 선택 단계.
export const LEVELS = {
  sprout: { key: "sprout", label: "1·2학년", sub: "1·2학년", tab: "1·2학년" },
  lower: { key: "lower", label: "3·4학년", sub: "3·4학년", tab: "3·4학년" },
  upper: { key: "upper", label: "5·6학년", sub: "5·6학년", tab: "5·6학년" },
};
// 토글 노출 순서(낮은 학년부터).
export const LEVEL_ORDER = ["sprout", "lower", "upper"];

// 조회수 저장소(Supabase).
//
// 왜 하필 'toktok' 프로젝트인가: Supabase 무료 요금제는 계정당 활성 프로젝트가 2개까지고
// 이미 2개를 쓰고 있어 아침신문 전용 프로젝트를 만들 수 없었다. 그래서 기존 프로젝트에
// 얹되, 그쪽 앱과 섞이지 않게 격리했다 — 조회수 테이블은 API에 노출되지 않는
// morningnews 스키마에 있고, 바깥에 나가는 건 mn_ 함수 두 개뿐이다.
// 자세한 구조와 격리 근거는 docs/supabase-views.sql 참고.
//
// anon key는 브라우저에 나가야 하므로 공개되는 것이 정상이다. 실제 방벽은 RLS와 함수
// 실행 권한이다. 이 키는 toktok 앱이 이미 웹에 배포되며 공개하고 있는 것과 같은 키다.
export const SUPABASE_URL = "https://wyoojgbtutwveouhexiw.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b29qZ2J0dXR3dmVvdWhleGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDY4MDAsImV4cCI6MjA5NzcyMjgwMH0.u1Im8LHGNTRCNJv8EI0EFBgtIw2WCUK25n3HUXZNS8k";
