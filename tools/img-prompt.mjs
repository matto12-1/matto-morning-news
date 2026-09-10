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
    literature: "a gentle storybook scene or a poem",
    tech: "technology and invention",
    society: "everyday society and life",
    // 2026-09-10: "art and music"이라고만 주면 계열 전체가 음악으로 끌려간다 — 건축 기사에
    // 음악회 그림이 나왔다. 계열은 넓게만 알려 주고, 무엇을 그릴지는 아래 concept 줄이 정한다.
    art: "the arts — this may be visual art, music, performance, or architecture; follow the concept below rather than assuming",
    mind: "feelings and a mindful heart",
    language: "Korean words and expressions",
  };
  return CAT[category] || "learning";
}

// 2026-09-10: 주제 자체가 '글자'인 기사(한글·낱말·시·큰 수 등)는 제목을 개념으로 넘기는 것만으로도
// 모델이 문자를 그린다 — 55호(한글 이름)에서 2026-08-07과 똑같이 깨진 한글 제목이 박혀 나왔다.
// 그런 편은 기사 JSON에 `imageConcept`(영어, 그릴 장면을 직접 서술)을 넣어 제목 대신 쓰게 한다.
export function buildImagePrompt(a) {
  const theme = categoryTheme(a.category);
  // 2026-09-10: 이 신문 제목은 대개 물음표로 끝난다. 그 제목을 개념으로 넘기면 모델이 물음표를
  // 글리프로 그려 넣는다(10-12·10-21에서 실제로 나왔다). 개념에서 물음표·느낌표를 걷어낸다.
  const strip = (s) => String(s).replace(/[?!？！]/g, "").replace(/\s{2,}/g, " ").trim();
  const concept = a.imageConcept || strip(`${a.title}${a.subtitle ? " — " + a.subtitle : ""}`);
  return (
    `Editorial illustration for a warm Korean children's magazine, for elementary students (ages 9-12). ` +
    `Theme: ${theme}. ` +
    // 제목을 따옴표로 그대로 인용하지 않는다 — 대신 "무엇을 그려야 하는지"를 개념으로 풀어서 전달.
    `Core concept to depict visually (do NOT spell out or write this as text — express it only through the scene, objects, and characters' actions/expressions): ${concept}. ` +
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
