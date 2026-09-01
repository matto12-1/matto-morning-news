// 브랜드 파일이 공용 저장소(f:/VibeCoding/mattolab-brand)와 어긋나지 않게 지킨다.
//
// 2026-09-01에 손으로 맞추다 어긋났다: 조회수 글자 크기가 12.5px와 16px로 달랐고
// CONTACT 라벨이 기사 갈래마다 색이 바뀌었다. 조용히 어긋나면 아무도 모른다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const UPSTREAM = "../mattolab-brand";

test("assets/brand/ 가 공용 저장소와 같은 판인가", () => {
  if (!existsSync(`${UPSTREAM}/sync.mjs`)) {
    // 다른 사람 기계에는 공용 저장소가 없을 수 있다. 그때는 건너뛴다.
    console.log("  (공용 저장소가 옆에 없어 건너뜀)");
    return;
  }
  const mine = readFileSync("assets/brand/VERSION", "utf8").trim();
  const theirs = readFileSync(`${UPSTREAM}/VERSION`, "utf8").trim();
  assert.equal(mine, theirs,
    `브랜드 파일이 낡았다(${mine} → ${theirs}). \`node ${UPSTREAM}/sync.mjs .\` 를 돌려라.`);
  // 판만 같고 내용이 다른 경우까지 잡는다(손으로 고쳤을 때).
  execFileSync(process.execPath, [`${UPSTREAM}/sync.mjs`, "--check", "."], { stdio: "pipe" });
});

test("사이트 쪽 사본을 손으로 고치지 않았는가", () => {
  if (!existsSync(`${UPSTREAM}/brand.js`)) return;
  for (const f of ["brand.js", "brand.css", "products.js"]) {
    assert.equal(readFileSync(`assets/brand/${f}`, "utf8"), readFileSync(`${UPSTREAM}/${f}`, "utf8"),
      `assets/brand/${f} 가 원본과 다르다. 사본을 고치면 다음 sync 때 덮인다: ${UPSTREAM}/${f} 를 고쳐라.`);
  }
});
