// assets/config.js — 서비스 전역 상수. 이름 확정 시 SITE_NAME만 변경.
export const SITE_NAME = "마또의 아침신문";
export const SITE_TAGLINE = "매일 아침, 한 편의 글과 함께";
export const TIMEZONE_OFFSET_MIN = 9 * 60; // KST(UTC+9)

// 난이도 라벨. sprout(1·2학년)은 기사에 body.sprout이 있을 때만 노출되는 선택 단계.
export const LEVELS = {
  sprout: { key: "sprout", label: "1·2학년", sub: "1·2학년", tab: "1·2학년" },
  lower: { key: "lower", label: "3·4학년", sub: "3·4학년", tab: "3·4학년" },
  upper: { key: "upper", label: "5·6학년", sub: "5·6학년", tab: "5·6학년" },
};
// 토글 노출 순서(낮은 학년부터).
export const LEVEL_ORDER = ["sprout", "lower", "upper"];
