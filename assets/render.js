// assets/render.js — 에디토리얼(잡지) 홈 렌더: 제호·키커·데크·메타바·드롭캡·발췌 인용·낱말풀이.
import { SITE_NAME, SITE_TAGLINE, CATEGORY_LABELS, LEVELS } from "./config.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}

// 본문 텍스트를 문단별 <p> 배열로. 어휘 낱말은 <button.vocab>로 감싼다.
export function renderParagraphs(text, vocab = []) {
  const words = vocab.map((v) => v.word).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = words.length ? new RegExp("(" + words.map(escapeReg).join("|") + ")", "g") : null;
  return String(text).split(/\n\n+/).map((p) => {
    if (!re) return `<p>${escapeHtml(p)}</p>`;
    let html = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(p))) {
      html += escapeHtml(p.slice(last, m.index));
      const w = m[1];
      html += `<button type="button" class="vocab" data-word="${escapeHtml(w)}" aria-label="낱말 뜻 보기: ${escapeHtml(w)}">${escapeHtml(w)}</button>`;
      last = m.index + w.length;
    }
    html += escapeHtml(p.slice(last));
    return `<p>${html}</p>`;
  });
}

// 호환용: 문단을 이어붙인 문자열.
export function renderBody(text, vocab = []) {
  return renderParagraphs(text, vocab).join("");
}

export function renderHome(article, { level = "lower", handlers = {} } = {}) {
  const el = document.createElement("article");
  el.className = `paper cat-${article.category}`;
  const cat = article.category;
  const rt = article.readingTimeMin?.[level];

  // 본문 + 발췌 인용(pullquote) 삽입(첫 문단 뒤).
  const paras = renderParagraphs(article.body[level], article.vocab);
  if (article.pullquote && paras.length >= 2) {
    paras.splice(1, 0, `<blockquote class="pullquote"><span>“</span>${escapeHtml(article.pullquote)}</blockquote>`);
  }

  el.innerHTML = `
    <header class="masthead">
      <div class="masthead-top">
        <span>${escapeHtml(SITE_TAGLINE)}</span>
        <span>초등 문해력 신문</span>
      </div>
      <h1 class="nameplate">${escapeHtml(SITE_NAME)}</h1>
      <div class="masthead-rule"><span>${escapeHtml(formatDate(article.date))}</span><span>제 ${article.issueNo} 호</span></div>
    </header>

    <nav class="toolbar" aria-label="읽기 도구">
      <div class="level-toggle" role="group" aria-label="학년 선택">
        <button type="button" class="lvl" data-level="lower" aria-pressed="${level === "lower"}">${LEVELS.lower.label}</button>
        <button type="button" class="lvl" data-level="upper" aria-pressed="${level === "upper"}">${LEVELS.upper.label}</button>
      </div>
      <div class="toolbar-right">
        <button type="button" class="tbtn" id="tts-btn" hidden>🔊 읽어주기</button>
        <button type="button" class="tbtn" id="font-btn" aria-pressed="false">가<span aria-hidden="true">＋</span> 큰 글씨</button>
        <button type="button" class="tbtn" id="print-btn">🖨 인쇄</button>
      </div>
    </nav>

    <div class="article">
      <p class="kicker">${escapeHtml(CATEGORY_LABELS[cat] || "")}</p>
      <h2 class="headline">${escapeHtml(article.title)}</h2>
      <p class="deck">${escapeHtml(article.subtitle)}</p>
      <div class="byline">
        <span class="byline-level">${LEVELS[level].label} · ${LEVELS[level].sub}</span>
        ${rt ? `<span class="byline-time">읽기 ${rt}분</span>` : ""}
      </div>
      <div class="body" id="article-body">${paras.join("")}</div>
      <aside class="glossary" aria-label="오늘의 낱말">
        <p class="glossary-label">낱말 풀이</p>
        <dl>
          ${(article.vocab || []).map((v) =>
            `<div class="gloss-row"><dt>${escapeHtml(v.word)}</dt><dd>${escapeHtml(v.meaning)}</dd></div>`
          ).join("")}
        </dl>
      </aside>
    </div>

    <div class="cta">
      <button type="button" class="btn primary big" id="start-quiz">오늘의 문제 풀기 →</button>
    </div>
  `;

  mountVocabTooltips(el, article.vocab);
  el.querySelectorAll(".lvl").forEach((b) =>
    b.addEventListener("click", () => handlers.onLevelChange?.(b.dataset.level))
  );
  el.querySelector("#start-quiz").addEventListener("click", () => handlers.onStartQuiz?.());
  el.querySelector("#print-btn").addEventListener("click", () => handlers.onPrint?.());
  return el;
}

export function mountVocabTooltips(root, vocab = []) {
  const map = new Map(vocab.map((v) => [v.word, v.meaning]));
  let openTip = null;
  const close = () => { if (openTip) { openTip.remove(); openTip = null; } };
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".vocab");
    if (!btn) { close(); return; }
    e.stopPropagation();
    const wasOpenFor = openTip && openTip._word === btn.dataset.word;
    close();
    if (wasOpenFor) return;
    const tip = document.createElement("span");
    tip.className = "vocab-tip";
    tip._word = btn.dataset.word;
    tip.setAttribute("role", "tooltip");
    tip.textContent = map.get(btn.dataset.word) || "";
    btn.insertAdjacentElement("afterend", tip);
    openTip = tip;
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".vocab") && !e.target.closest(".vocab-tip")) close();
  });
}
