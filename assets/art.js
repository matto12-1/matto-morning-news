// assets/art.js — 손으로 그린 플랫 SVG (히어로/스펙클/별). Gemini 회복 시 교체 슬롯.

export const SPECKLE = `
<svg class="speckle" aria-hidden="true"><defs>
  <pattern id="fib" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
    <rect x="10" y="14" width="14" height="3" rx="1.5" fill="#EE5A36" opacity=".5"/>
    <rect x="60" y="40" width="10" height="3" rx="1.5" fill="#2FA79B" opacity=".45"/>
    <rect x="34" y="70" width="12" height="3" rx="1.5" fill="#F0A83C" opacity=".5"/>
    <circle cx="76" cy="16" r="2" fill="#8CC9EA" opacity=".6"/>
    <circle cx="20" cy="52" r="1.6" fill="#EE5A36" opacity=".4"/>
  </pattern></defs>
  <rect width="100%" height="100%" fill="url(#fib)"/>
</svg>`;

export const STAR = (fill, stroke) =>
  `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4 L37 22 L56 24 L41 36 L46 55 L30 44 L14 55 L19 36 L4 24 L23 22Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`;

// 과학: 무지개 타고 하늘을 파랗게 칠하는 웃는 해
const SCIENCE = `
<svg viewBox="0 0 520 520" role="img" aria-label="무지개 위에서 붓으로 하늘을 칠하는 웃는 해">
  <g fill="none" stroke-width="15" stroke-linecap="round" opacity=".95">
    <path d="M40 470 A215 215 0 0 1 470 470" stroke="#F26D6D"/>
    <path d="M66 470 A189 189 0 0 1 444 470" stroke="#F6A23C"/>
    <path d="M92 470 A163 163 0 0 1 418 470" stroke="#FBD24A"/>
    <path d="M118 470 A137 137 0 0 1 392 470" stroke="#7BC86C"/>
    <path d="M144 470 A111 111 0 0 1 366 470" stroke="#5AB4E5"/>
  </g>
  <path d="M120 150 Q210 120 300 150 Q250 175 120 168Z" fill="#5AB4E5" opacity=".9"/>
  <g transform="translate(300 200)">
    <g stroke="#F59E1B" stroke-width="16" stroke-linecap="round">
      <line x1="0" y1="-150" x2="0" y2="-112"/><line x1="106" y1="-106" x2="80" y2="-80"/>
      <line x1="150" y1="0" x2="112" y2="0"/><line x1="106" y1="106" x2="80" y2="80"/>
      <line x1="0" y1="150" x2="0" y2="112"/><line x1="-106" y1="106" x2="-80" y2="80"/>
      <line x1="-150" y1="0" x2="-112" y2="0"/><line x1="-106" y1="-106" x2="-80" y2="-80"/>
    </g>
    <circle r="98" fill="#FCC419"/><circle r="98" fill="url(#sung)"/>
    <circle cx="-34" cy="-8" r="11" fill="#5a3d00"/><circle cx="34" cy="-8" r="11" fill="#5a3d00"/>
    <circle cx="-30" cy="-12" r="3.5" fill="#fff"/><circle cx="38" cy="-12" r="3.5" fill="#fff"/>
    <ellipse cx="-52" cy="20" rx="15" ry="10" fill="#F98C8C" opacity=".85"/>
    <ellipse cx="52" cy="20" rx="15" ry="10" fill="#F98C8C" opacity=".85"/>
    <path d="M-34 26 Q0 60 34 26 Q22 44 0 44 Q-22 44 -34 26Z" fill="#7a3b1e"/>
    <path d="M-16 40 Q0 52 16 40 Z" fill="#F26D6D"/>
  </g>
  <g>
    <path d="M232 236 Q168 232 150 176" stroke="#F1A83A" stroke-width="24" fill="none" stroke-linecap="round"/>
    <g transform="translate(150 176) rotate(-28)">
      <rect x="-8" y="-4" width="70" height="12" rx="6" fill="#C98A4B"/>
      <rect x="54" y="-10" width="20" height="24" rx="5" fill="#9aa7b5"/>
      <path d="M72 -12 Q98 0 72 14 Q86 0 72 -12Z" fill="#5AB4E5"/>
    </g>
  </g>
  <g transform="translate(96 300)">
    <ellipse cx="0" cy="8" rx="60" ry="34" fill="#fff"/><ellipse cx="42" cy="-6" rx="40" ry="30" fill="#fff"/>
    <ellipse cx="-40" cy="-2" rx="34" ry="26" fill="#fff"/>
    <circle cx="-8" cy="4" r="4" fill="#8aa0b5"/><circle cx="16" cy="4" r="4" fill="#8aa0b5"/>
    <path d="M-6 14 Q4 22 14 14" stroke="#8aa0b5" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="-18" cy="12" r="6" fill="#BFE0F2" opacity=".8"/><circle cx="26" cy="12" r="6" fill="#BFE0F2" opacity=".8"/>
  </g>
  <defs><radialGradient id="sung" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#F5A623"/></radialGradient></defs>
</svg>`;

// 역사: 두루마리 + 깃펜
const HISTORY = `
<svg viewBox="0 0 520 520" role="img" aria-label="옛 두루마리와 깃펜">
  <ellipse cx="260" cy="430" rx="150" ry="26" fill="#0000000f"/>
  <rect x="150" y="150" width="220" height="230" rx="14" fill="#FBF1DC"/>
  <rect x="150" y="150" width="220" height="230" rx="14" fill="none" stroke="#C9A96A" stroke-width="4"/>
  <g stroke="#CDB488" stroke-width="8" stroke-linecap="round"><line x1="180" y1="200" x2="340" y2="200"/><line x1="180" y1="235" x2="340" y2="235"/><line x1="180" y1="270" x2="300" y2="270"/></g>
  <rect x="132" y="130" width="256" height="34" rx="17" fill="#B98A4A"/>
  <rect x="132" y="366" width="256" height="34" rx="17" fill="#B98A4A"/>
  <g transform="translate(330 120) rotate(28)"><path d="M0 0 Q60 -110 120 -150 Q70 -60 44 30Z" fill="#7FA83E"/><rect x="-6" y="20" width="12" height="46" rx="5" fill="#5a3d1a"/></g>
  <circle cx="200" cy="110" r="10" fill="#F5C23E"/>
</svg>`;

// 문학: 펼친 책 + 반짝임
const LITERATURE = `
<svg viewBox="0 0 520 520" role="img" aria-label="펼쳐진 책과 반짝임">
  <ellipse cx="260" cy="420" rx="160" ry="26" fill="#0000000f"/>
  <path d="M260 180 Q180 150 110 175 L110 360 Q180 335 260 365Z" fill="#fff" stroke="#B79AE0" stroke-width="4"/>
  <path d="M260 180 Q340 150 410 175 L410 360 Q340 335 260 365Z" fill="#fff" stroke="#B79AE0" stroke-width="4"/>
  <path d="M260 180 L260 365" stroke="#7A4FB5" stroke-width="6"/>
  <path d="M110 360 Q180 335 260 365 Q340 335 410 360 L410 392 Q340 367 260 397 Q180 367 110 392Z" fill="#7A4FB5"/>
  <g stroke="#C9B6EA" stroke-width="5" stroke-linecap="round"><line x1="140" y1="215" x2="235" y2="228"/><line x1="140" y1="245" x2="235" y2="258"/><line x1="285" y1="228" x2="380" y2="215"/><line x1="285" y1="258" x2="380" y2="245"/></g>
  <path d="M330 120 l10 26 27 6 -20 19 5 28 -22 -14 -22 14 5 -28 -20 -19 27 -6Z" fill="#E8A33D"/>
  <circle cx="150" cy="140" r="7" fill="#E8A33D"/>
</svg>`;

// 우리말: 말풍선 + 가나다
const LANGUAGE = `
<svg viewBox="0 0 520 520" role="img" aria-label="가나다가 적힌 말풍선">
  <ellipse cx="260" cy="430" rx="150" ry="26" fill="#0000000f"/>
  <path d="M120 130 h280 a34 34 0 0 1 34 34 v150 a34 34 0 0 1 -34 34 h-150 l-60 56 v-56 h-70 a34 34 0 0 1 -34 -34 v-150 a34 34 0 0 1 34 -34Z" fill="#fff" stroke="#D14B34" stroke-width="6"/>
  <text x="260" y="255" text-anchor="middle" font-family="Jua, sans-serif" font-size="92" fill="#D14B34">가나다</text>
  <circle cx="150" cy="110" r="8" fill="#F0A72E"/><circle cx="380" cy="115" r="6" fill="#7FA83E"/>
</svg>`;

const HEROES = { science: SCIENCE, history: HISTORY, literature: LITERATURE, language: LANGUAGE };
export function heroSvg(category) { return HEROES[category] || SCIENCE; }
