// assets/config.js — 서비스 전역 상수. 이름 확정 시 SITE_NAME만 변경.
export const SITE_NAME = "마또의 아침신문";
export const SITE_TAGLINE = "매일 아침, 한 편의 글과 함께";
export const TIMEZONE_OFFSET_MIN = 9 * 60; // KST(UTC+9)

export const CATEGORY_LABELS = {
  science: "과학·자연·우주",
  history: "역사·인물·문화",
  literature: "문학·고전·신화",
  language: "우리말·사회상식",
};

export const CATEGORY_EMOJI = {
  science: "🔬",
  history: "🏛️",
  literature: "📖",
  language: "🈶",
};

// 난이도 라벨
export const LEVELS = {
  lower: { key: "lower", label: "저학년", sub: "3·4학년" },
  upper: { key: "upper", label: "고학년", sub: "5·6학년" },
};
