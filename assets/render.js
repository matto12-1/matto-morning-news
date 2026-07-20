// assets/render.js — 홈(제호·헤드라인·본문·어휘 툴팁) 렌더.
import { SITE_NAME, SITE_TAGLINE, CATEGORY_LABELS, CATEGORY_EMOJI, LEVELS } from "./config.js";

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

// 본문 텍스트를 문단 <p>로, 어휘 낱말은 <button.vocab>로 감싸 반환(HTML 문자열).
export function renderBody(text, vocab = []) {
  const words = vocab.map((v) => v.word).filter(Boolean).sort((a, b) => b.length - a.length);
  const paras = String(text).split(/\n\n+/);
  const re = words.length ? new RegExp("(" + words.map(escapeReg).join("|") + ")", "g") : null;
  return paras
    .map((p) => {
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
    })
    .join("");
}

// 홈 뷰 엘리먼트 생성. handlers: {onStartQuiz, onPrint, onLevelChange}
export function renderHome(article, { level = "lower", handlers = {} } = {}) {
  const el = document.createElement("article");
  el.className = "paper";
  const cat = article.category;
  const bodyText = article.body[level];
  const rt = article.readingTimeMin?.[level];

  el.innerHTML = `
    <header class="masthead">
      <p class="masthead-tagline">${escapeHtml(SITE_TAGLINE)}</p>
      <h1 class="masthead-title">${escapeHtml(SITE_NAME)}</h1>
      <div class="masthead-meta">
        <span>${escapeHtml(formatDate(article.date))}</span>
        <span class="dot">·</span>
        <span>제 ${article.issueNo} 호</span>
      </div>
    </header>

    <div class="toolbar" role="toolbar" aria-label="읽기 도구">
      <div class="level-toggle" role="group" aria-label="학년 선택">
        <button type="button" class="lvl" data-level="lower" aria-pressed="${level === "lower"}">
          ${LEVELS.lower.label} <small>${LEVELS.lower.sub}</small>
        </button>
        <button type="button" class="lvl" data-level="upper" aria-pressed="${level === "upper"}">
          ${LEVELS.upper.label} <small>${LEVELS.upper.sub}</small>
        </button>
      </div>
      <div class="toolbar-right">
        <button type="button" class="btn ghost" id="tts-btn" hidden>🔊 읽어주기</button>
        <button type="button" class="btn ghost" id="font-btn" aria-pressed="false">🔎 큰 글씨</button>
        <button type="button" class="btn ghost" id="print-btn">🖨️ 인쇄</button>
      </div>
    </div>

    <div class="article">
      <p class="cat-badge cat-${cat}">${CATEGORY_EMOJI[cat] || "📰"} ${escapeHtml(CATEGORY_LABELS[cat] || "")}</p>
      <h2 class="headline">${escapeHtml(article.title)}</h2>
      <p class="subhead">${escapeHtml(article.subtitle)}</p>
      ${rt ? `<p class="readtime">📖 약 ${rt}분이면 읽어요</p>` : ""}
      <div class="body" id="article-body">${renderBody(bodyText, article.vocab)}</div>
      <aside class="glossary" aria-label="오늘의 낱말">
        <h3>📚 오늘의 낱말</h3>
        <dl>
          ${(article.vocab || []).map((v) =>
            `<div class="gloss-row"><dt>${escapeHtml(v.word)}</dt><dd>${escapeHtml(v.meaning)}</dd></div>`
          ).join("")}
        </dl>
      </aside>
    </div>

    <div class="cta">
      <button type="button" class="btn primary big" id="start-quiz">오늘의 퀴즈 풀기 →</button>
    </div>
  `;

  // 어휘 툴팁 마운트
  mountVocabTooltips(el, article.vocab);

  // 이벤트
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
