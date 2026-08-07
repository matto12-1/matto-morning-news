// tools/gen-image.mjs — 기사 1편의 표지 일러스트를 Gemini(gemini-2.5-flash-image, 나노바나나)로 생성.
// 사용: node tools/gen-image.mjs 2026-08-19
import fs from "node:fs/promises";
import { buildImagePrompt } from "./img-prompt.mjs";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY 없음"); process.exit(1); }

const date = process.argv[2];
if (!date) { console.error("날짜 인자 필요 (예: 2026-08-19)"); process.exit(1); }

const a = JSON.parse(await fs.readFile(`content/${date}.json`, "utf8"));

// 아이들 잡지풍 플랫 일러스트, 글자 없이, 3:2 가로, 기사 내용과 관련된 장면.
const prompt = buildImagePrompt(a);

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
});

const j = await res.json();
if (!res.ok) { console.error("HTTP", res.status, JSON.stringify(j).slice(0, 700)); process.exit(1); }

const parts = j?.candidates?.[0]?.content?.parts || [];
const imgPart = parts.find((p) => p.inlineData || p.inline_data);
if (!imgPart) { console.error("이미지 파트 없음. 응답:", JSON.stringify(j).slice(0, 900)); process.exit(1); }

const b64 = (imgPart.inlineData || imgPart.inline_data).data;
const buf = Buffer.from(b64, "base64");
await fs.mkdir("content/img", { recursive: true });
const out = `content/img/${date}.png`;
await fs.writeFile(out, buf);
console.log("SAVED", out, buf.length, "bytes");
