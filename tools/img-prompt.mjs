// tools/img-prompt.mjs — 기사 표지 일러스트 프롬프트 빌더 (gen-image.mjs / gen-all-images.mjs 공용).
//
// 2026-08-07자 이미지에 영어 제목 + 깨진 한글이 그대로 박혀 나온 사고 이후 강화됨.
// 원인: 프롬프트에 기사 제목을 따옴표로 그대로 인용하면(`"${titleEn}" — ${title}`) 모델이
// 그 문구를 캡션/간판처럼 그림 위에 그려 넣으려 하고, 특히 한글은 자모가 깨진 형태로 나온다.
// "학교", "우유", "분리수거 라벨"처럼 원래 간판·글자가 있는 소재는 "NO text" 지시 한 줄만으로는
// 잘 지켜지지 않았다(학교 건물에 SCHOOL, 우유팩에 MILK, 분리수거통에 Paper/Plastics/Cans 등).
//
// 대응:
// 1) 제목을 따옴표로 인용하지 않고 "시각적 개념"으로 재서술하도록 지시 — 문구를 그대로 베끼지 못하게 함.
// 2) 금지 항목을 언어별·형태별로 구체적으로 나열(한글/영어/숫자/구두점 기호/간판/라벨/로고/말풍선).
// 3) 이미지가 기사 주제와 무관하게 예쁘기만 한 그림이 되지 않도록 "핵심 개념을 시각적으로 표현" 지시를 별도 문장으로 명시.
export function categoryTheme(category) {
  const CAT = {
    science: "science and nature",
    history: "history and culture",
    literature: "a gentle storybook scene",
    tech: "technology and invention",
    society: "everyday society and life",
    art: "art and music",
    mind: "feelings and a mindful heart",
    language: "Korean words and expressions",
  };
  return CAT[category] || "learning";
}

export function buildImagePrompt(a) {
  const theme = categoryTheme(a.category);
  return (
    `Editorial illustration for a warm Korean children's magazine, for elementary students (ages 9-12). ` +
    `Theme: ${theme}. ` +
    // 제목을 따옴표로 그대로 인용하지 않는다 — 대신 "무엇을 그려야 하는지"를 개념으로 풀어서 전달.
    `Core concept to depict visually (do NOT spell out or write this as text — express it only through the scene, objects, and characters' actions/expressions): ${a.title}${a.subtitle ? " — " + a.subtitle : ""}. ` +
    `The illustration must clearly and specifically relate to this concept — avoid a generic pretty scene that could fit any topic; a reader should recognize the topic from the imagery alone. ` +
    `Style: friendly flat-vector storybook illustration with soft grain texture, bright but gentle pastel colors, ` +
    `cozy and clean, one clear central subject, simple uncluttered background, soft warm lighting. ` +
    `Overall palette and background: soft, light, airy, low-saturation warm cream and gentle pastel tones, so it blends into a warm pastel page. ` +
    `Composition: landscape 3:2, subject centered. ` +
    `ABSOLUTELY NO TEXT OF ANY KIND: no Korean characters (hangul), no English letters or words, no numbers, no punctuation symbols drawn as glyphs (no ?, !, X, O, checkmarks), ` +
    `no captions, no titles, no labels, no signage lettering, no product logos or brand text, no speech bubbles, no writing on any surface (signs, packaging, clothing, books, screens, walls). ` +
    `If an object like a book, sign, screen, or package appears, show it blank or turned away — never with visible writing.`
  );
}
