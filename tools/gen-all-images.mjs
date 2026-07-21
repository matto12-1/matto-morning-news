// tools/gen-all-images.mjs — 모든 기사 표지 일러스트를 Gemini(flat-vector, 크림 배경)로 생성 + sharp 압축.
// 이미 있는 jpg는 건너뜀. 한 번에 최대 LIMIT장 처리(타임아웃 회피). 재실행하면 이어서 진행.
// 사용: node tools/gen-all-images.mjs [LIMIT]
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY 없음"); process.exit(1); }
const LIMIT = Number(process.argv[2] || 15);
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`;

const CAT = {
  science: "science and nature", history: "history and culture", literature: "a gentle storybook scene",
  tech: "technology and invention", society: "everyday society and life", art: "art and music",
  mind: "feelings and a mindful heart", language: "Korean words and expressions",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function genOne(a) {
  const prompt =
    `Editorial illustration for a warm Korean children's magazine, for elementary students (ages 9-12). ` +
    `Theme: ${CAT[a.category] || "learning"}. Topic: "${a.titleEn}" — ${a.title}. ${a.subtitle || ""}. ` +
    `Style: flat-vector storybook illustration with subtle grain texture, clean rounded shapes, gentle soft shading, cheerful and friendly. ` +
    `Overall palette and background: soft, light, airy, low-saturation warm cream and gentle pastel tones, so it blends into a warm pastel page. ` +
    `Composition: landscape, one clear central subject, simple uncluttered background, soft warm lighting. ` +
    `VERY IMPORTANT: absolutely NO text, NO letters, NO words, NO numbers, NO captions or labels anywhere in the image.`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      if (res.status === 429 || res.status >= 500) { await sleep(attempt * 8000); continue; }
      const j = await res.json();
      if (!res.ok) { console.error(a.date, "HTTP", res.status, JSON.stringify(j).slice(0, 200)); await sleep(3000); continue; }
      const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      if (!part) { console.error(a.date, "NO IMAGE", JSON.stringify(j).slice(0, 200)); await sleep(3000); continue; }
      const raw = Buffer.from((part.inlineData || part.inline_data).data, "base64");
      const out = `content/img/${a.date}.jpg`;
      await sharp(raw).resize({ width: 1000 }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
      const kb = Math.round((await fs.stat(out)).size / 1024);
      console.log("OK", a.date, "#" + a.issueNo, kb + "KB", "-", a.title.slice(0, 20));
      return true;
    } catch (e) { console.error(a.date, "ERR", String(e).slice(0, 120)); await sleep(attempt * 5000); }
  }
  console.error("FAIL", a.date, "(4회 실패)");
  return false;
}

const files = (await fs.readdir("content")).filter((f) => /^2026-\d\d-\d\d\.json$/.test(f));
const arts = (await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile("content/" + f, "utf8"))))).sort((a, b) => a.issueNo - b.issueNo);
await fs.mkdir("content/img", { recursive: true });

let done = 0, todo = 0;
for (const a of arts) {
  if (existsSync(`content/img/${a.date}.jpg`)) continue;
  if (done >= LIMIT) { todo++; continue; }
  const ok = await genOne(a);
  if (ok) done++;
  await sleep(1200); // 레이트리밋 완화
}
const remaining = arts.filter((a) => !existsSync(`content/img/${a.date}.jpg`)).length;
console.log(`\n이번 실행: ${done}장 생성 / 남은: ${remaining}장`);
