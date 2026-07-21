// assets/render.js — 어린이 잡지 시안 결의 홈/기사 렌더.
import { SITE_NAME, CATEGORY_LABELS, LEVELS } from "./config.js";
import { heroSvg, SPECKLE, STAR } from "./art.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SHORT_CAT = { science: "과학", history: "역사", literature: "문학", language: "우리말" };

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}

// 문단 배열(어휘 낱말 하이라이트 포함)
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

export function renderBody(text, vocab = []) {
  return renderParagraphs(text, vocab).join("");
}

// 섹션(배열 또는 문자열)을 소제목 + 2단으로. 첫 문단엔 드롭캡.
export function renderStory(body, vocab = []) {
  const sections = Array.isArray(body) ? body : [{ text: String(body) }];
  return sections.map((sec, si) => {
    const paras = renderParagraphs(sec.text, vocab);
    if (si === 0 && paras.length) paras[0] = paras[0].replace("<p>", '<p class="drop">');
    const head = sec.heading ? `<h2 class="redhead">${escapeHtml(sec.heading)}</h2>` : "";
    return head + `<div class="cols">${paras.join("")}</div>`;
  }).join("");
}

export function renderHome(article, { level = "lower", handlers = {} } = {}) {
  const el = document.createElement("article");
  el.className = `paper cat-${article.category}`;
  const cat = article.category;
  const rt = article.readingTimeMin?.[level];
  const intro = article.intro || article.subtitle || "";
  const badgeTease = article.badgeTease || "함께 알아봐요";
  const secs = Array.isArray(article.body[level]) ? article.body[level] : [];
  const headings = secs.map((s) => s.heading).filter(Boolean);
  const tocHtml = headings.length
    ? `<div class="toc"><p class="toc-h">📖 이 글에서는</p><ol>${headings.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ol></div>`
    : "";

  el.innerHTML = `
    ${SPECKLE}
    <header class="topbar">
      <span class="brand">${escapeHtml(SITE_NAME)}<span class="brand-meta">${escapeHtml(formatDate(article.date))} · 제 ${article.issueNo} 호</span></span>
      <div class="controls">
        <div class="level-toggle" role="group" aria-label="학년 선택">
          <button type="button" class="lvl" data-level="lower" aria-pressed="${level === "lower"}">${LEVELS.lower.label}</button>
          <button type="button" class="lvl" data-level="upper" aria-pressed="${level === "upper"}">${LEVELS.upper.label}</button>
        </div>
        <button type="button" class="tbtn" id="tts-btn" hidden>🔊 읽어주기</button>
        <button type="button" class="tbtn" id="font-btn" aria-pressed="false">가+ 큰 글씨</button>
        <button type="button" class="tbtn" id="print-btn">🖨 인쇄</button>
      </div>
    </header>

    <div class="lead">
      <div class="lead-main">
        <div class="badge"><div class="tag"><span class="sm">${escapeHtml(badgeTease)}</span><span class="lg">${SHORT_CAT[cat] || "오늘"} 특집</span></div></div>
        <p class="intro">${escapeHtml(intro)}<span class="by">글·그림 ${escapeHtml(SITE_NAME)} 편집부</span></p>
        <div class="cover-title">
          ${article.titleEn ? `<p class="title-en">${escapeHtml(article.titleEn)}</p>` : ""}
          <h1 class="hook">${escapeHtml(article.title)}</h1>
          <p class="subtitle">${escapeHtml(article.subtitle)}</p>
        </div>
      </div>
      <aside class="lead-side">
        ${tocHtml}
        <div class="hero">${heroSvg(cat)}<div class="float s1">${STAR("#FFD84D", "#EABB2E")}</div><div class="float s2">${STAR("#8FD3F2", "#5BB4E5")}</div></div>
      </aside>
    </div>

    <div class="story">
      <div id="article-body">${renderStory(article.body[level], article.vocab)}</div>
      ${article.factbox ? `<aside class="callout">
        <svg class="ic" viewBox="0 0 60 60" aria-hidden="true"><circle cx="26" cy="26" r="18" fill="none" stroke="#2FA79B" stroke-width="6"/><line x1="39" y1="39" x2="54" y2="54" stroke="#2FA79B" stroke-width="7" stroke-linecap="round"/></svg>
        <h3>${escapeHtml(article.factbox.title)}</h3>
        <p>${escapeHtml(article.factbox.text)}</p>
      </aside>` : ""}
    </div>

    <div class="cta"><button type="button" class="btn primary big" id="start-quiz">오늘의 문제 풀기 →</button></div>
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
