// tools/gen-samples.mjs — 같은 장면을 여러 아트 스타일로 생성(컨셉 시안용).
import fs from "node:fs/promises";
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY 없음"); process.exit(1); }

const scene =
  "A cute chubby little green frog sitting on the rim of an old mossy stone well, " +
  "looking up with wonder at a wide world beyond — rolling green hills, a winding river, " +
  "soft fluffy clouds and a faint rainbow in a big open sky.";
const palette =
  "Overall palette and background: soft, light, airy, low-saturation warm cream and gentle peach pastel tones, " +
  "so it blends smoothly into a warm pastel magazine page. Landscape composition, subject centered, simple and uncluttered. " +
  "VERY IMPORTANT: absolutely NO text, NO letters, NO words, NO numbers, NO captions anywhere.";

const styles = [
  { name: "flat", text: "Flat-vector storybook illustration with subtle grain texture, clean shapes, gentle shading." },
  { name: "water", text: "Soft watercolor and colored-pencil picture-book illustration, delicate paper texture, hand-painted feel." },
  { name: "paper", text: "Cut-paper collage / layered papercraft illustration, soft paper shadows, handcrafted look." },
];

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`;
await fs.mkdir("content/img/samples", { recursive: true });

for (const s of styles) {
  const prompt = `Editorial illustration for a warm Korean children's magazine (ages 9-12). Concept: "The frog in the well" — learning the world is bigger than you think. ${scene} Style: ${s.text} ${palette}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
  const j = await res.json();
  if (!res.ok) { console.error(s.name, "HTTP", res.status, JSON.stringify(j).slice(0, 400)); continue; }
  const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  if (!part) { console.error(s.name, "NO IMAGE", JSON.stringify(j).slice(0, 400)); continue; }
  const buf = Buffer.from((part.inlineData || part.inline_data).data, "base64");
  const out = `content/img/samples/frog-${s.name}.png`;
  await fs.writeFile(out, buf);
  console.log("SAVED", out, buf.length, "bytes");
}
