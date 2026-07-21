// assets/render.js — 에디토리얼(잡지) 홈 렌더: 제호·키커·데크·메타바·드롭캡·발췌 인용·낱말풀이.
import { SITE_NAME, CATEGORY_LABELS, CATEGORY_EMOJI, LEVELS } from "./config.js";
import { heroSvg, MASCOT } from "./art.js";

// 제목에서 강조 낱말(titleHi)만 색칠.
function highlightTitle(title, hi) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (hi && title.includes(hi)) return esc(title).replace(esc(hi), `<mark class="hi">${esc(hi)}</mark>`);
  return esc(title);
}

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

// 본문 조판: 섹션 배열([{heading?, text}]) 또는 문자열을 2단 조판 HTML로.
export function renderStory(body, vocab = [], pullquote = "") {
  const sections = Array.isArray(body) ? body : [{ text: String(body) }];
  return sections.map((sec, si) => {
    const paras = renderParagraphs(sec.text, vocab);
    if (si === 0 && pullquote) {
      const at = Math.min(1, paras.length);
      paras.splice(at, 0, `<blockquote class="pullquote"><span aria-hidden="true">“</span>${escapeHtml(pullquote)}</blockquote>`);
    }
    const head = sec.heading ? `<h3 class="section-head">${escapeHtml(sec.heading)}</h3>` : "";
    return `<section class="story-section${si === 0 ? " first" : ""}">${head}<div class="cols">${paras.join("")}</div></section>`;
  }).join("");
}

export function renderHome(article, { level = "lower", handlers = {} } = {}) {
  const el = document.createElement("article");
  el.className = `paper cat-${article.category}`;
  const cat = article.category;
  const rt = article.readingTimeMin?.[level];

  // 본문(섹션 배열 또는 문자열) → 2단 조판 + 발췌 인용.
  const storyHtml = renderStory(article.body[level], article.vocab, article.pullquote);

  el.innerHTML = `
    <header class="masthead">
      <span class="brand">${escapeHtml(SITE_NAME)}</span>
      <span class="masthead-meta">${escapeHtml(formatDate(article.date))} · 제 ${article.issueNo} 호</span>
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
      <div class="cover">
        <div class="cover-text">
          <p class="feat-badge">${CATEGORY_EMOJI[cat] || "📰"} ${escapeHtml(CATEGORY_LABELS[cat] || "")} 특집</p>
          ${article.titleEn ? `<p class="title-en">${escapeHtml(article.titleEn)}</p>` : ""}
          <h2 class="headline">${highlightTitle(article.title, article.titleHi)}</h2>
          <p class="deck">${escapeHtml(article.subtitle)}</p>
        </div>
        <div class="cover-art">${heroSvg(cat)}</div>
      </div>
      <div class="byline">
        <span class="byline-level">${LEVELS[level].label} · ${LEVELS[level].sub}</span>
        ${rt ? `<span class="byline-time">읽기 ${rt}분</span>` : ""}
      </div>
      <div class="body" id="article-body">${storyHtml}</div>
      ${article.factbox ? `<aside class="factbox">
        <div class="factbox-mascot">${MASCOT}</div>
        <div class="factbox-body"><p class="factbox-title">${escapeHtml(article.factbox.title)}</p><p>${escapeHtml(article.factbox.text)}</p></div>
      </aside>` : ""}
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
