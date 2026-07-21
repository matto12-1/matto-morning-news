// assets/art.js — 손으로 그린 플랫 SVG 일러스트(히어로/마스코트).
// Gemini 한도 회복 시 이 슬롯을 진짜 일러스트로 교체.

// 과학·하늘: 웃는 해 + 무지개 광선 + 구름
const SCIENCE_SKY = `
<svg viewBox="0 0 400 300" role="img" aria-label="파란 하늘에 뜬 해와 무지개 삽화" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8FD3F2"/><stop offset="1" stop-color="#D9F1FB"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#sky)"/>
  <!-- 무지개 -->
  <g fill="none" stroke-width="9">
    <path d="M40 300 A160 160 0 0 1 360 300" stroke="#F26D6D"/>
    <path d="M58 300 A142 142 0 0 1 342 300" stroke="#F6A23C"/>
    <path d="M76 300 A124 124 0 0 1 324 300" stroke="#FBD24A"/>
    <path d="M94 300 A106 106 0 0 1 306 300" stroke="#7BC86C"/>
    <path d="M112 300 A88 88 0 0 1 288 300" stroke="#5AB4E5"/>
  </g>
  <!-- 해 -->
  <g transform="translate(300 78)">
    <g stroke="#FBB806" stroke-width="7" stroke-linecap="round">
      <line x1="0" y1="-64" x2="0" y2="-46"/><line x1="45" y1="-45" x2="33" y2="-33"/>
      <line x1="64" y1="0" x2="46" y2="0"/><line x1="45" y1="45" x2="33" y2="33"/>
      <line x1="-45" y1="-45" x2="-33" y2="-33"/><line x1="-64" y1="0" x2="-46" y2="0"/>
    </g>
    <circle r="40" fill="#FCC419"/>
    <circle cx="-14" cy="-4" r="5" fill="#7a5200"/><circle cx="14" cy="-4" r="5" fill="#7a5200"/>
    <path d="M-15 12 Q0 26 15 12" fill="none" stroke="#7a5200" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-24" cy="8" r="6" fill="#F98C8C" opacity=".8"/><circle cx="24" cy="8" r="6" fill="#F98C8C" opacity=".8"/>
  </g>
  <!-- 구름 -->
  <g fill="#fff">
    <ellipse cx="96" cy="150" rx="46" ry="26"/><ellipse cx="132" cy="140" rx="34" ry="24"/>
    <ellipse cx="70" cy="140" rx="28" ry="20"/>
  </g>
</svg>`;

// 나머지 갈래: 단순 플랫(임시). 나중에 교체.
const GENERIC = (emoji, bg1, bg2) => `
<svg viewBox="0 0 400 300" role="img" aria-label="기사 삽화" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <text x="200" y="180" font-size="130" text-anchor="middle">${emoji}</text>
</svg>`;

const HEROES = {
  science: SCIENCE_SKY,
  history: GENERIC("🏛️", "#F6E5C4", "#EBCF97"),
  literature: GENERIC("📖", "#E9DEF8", "#D3BEF0"),
  language: GENERIC("💬", "#FBD7CE", "#F4B7A5"),
};

export function heroSvg(category) {
  return HEROES[category] || GENERIC("📰", "#e8eef5", "#cfd9e6");
}

// 말풍선 옆 꼬마 마스코트(돋보기 든 새싹 캐릭터)
export const MASCOT = `
<svg viewBox="0 0 80 80" role="img" aria-label="안내 캐릭터">
  <circle cx="40" cy="46" r="26" fill="#7BC86C"/>
  <circle cx="31" cy="42" r="4.5" fill="#274b1c"/><circle cx="49" cy="42" r="4.5" fill="#274b1c"/>
  <path d="M31 54 Q40 62 49 54" fill="none" stroke="#274b1c" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M40 20 Q34 6 26 10 Q34 12 40 22Z" fill="#5aa84f"/>
  <path d="M40 20 Q46 6 54 10 Q46 12 40 22Z" fill="#5aa84f"/>
  <circle cx="26" cy="52" r="5" fill="#F98C8C" opacity=".7"/><circle cx="54" cy="52" r="5" fill="#F98C8C" opacity=".7"/>
</svg>`;
