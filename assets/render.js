// assets/render.js — 어린이 잡지 시안 결의 홈/기사 렌더.
import { SITE_NAME, LEVELS, LEVEL_ORDER, SIBLING } from "./config.js";
import { SPECKLE } from "./art.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SHORT_CAT = {
  science: "과학", history: "역사", literature: "문학", language: "우리말",
  tech: "기술", society: "사회", art: "예술", mind: "마음",
};

// 팩트박스: 학년별 override({sprout:{title,text}})가 있으면 그 단계, 없으면 기본 {title,text}.
function pickFactbox(fb, level) {
  if (!fb) return null;
  if (fb[level] && fb[level].text) return fb[level];
  return fb;
}

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}

// 문단 배열(어휘 낱말 하이라이트 포함). seen: 이미 밑줄 친 낱말 — 첫 등장에만 표시.
export function renderParagraphs(text, vocab = [], seen = new Set()) {
  const words = vocab.map((v) => v.word).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = words.length ? new RegExp("(" + words.map(escapeReg).join("|") + ")", "g") : null;
  return String(text).split(/\n\n+/).map((p) => {
    if (!re) return `<p>${escapeHtml(p)}</p>`;
    let html = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(p))) {
      html += escapeHtml(p.slice(last, m.index));
      const w = m[1];
      if (seen.has(w)) {
        html += escapeHtml(w); // 두 번째 등장부터는 그냥 본문 글자로
      } else {
        seen.add(w);
        html += `<button type="button" class="vocab" data-word="${escapeHtml(w)}" aria-label="낱말 뜻 보기: ${escapeHtml(w)}">${escapeHtml(w)}</button>`;
      }
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
  const seen = new Set(); // 기사 전체에서 낱말당 한 번만 밑줄
  return sections.map((sec, si) => {
    const paras = renderParagraphs(sec.text, vocab, seen);
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
  const badgeLabel = article.badgeLabel || SHORT_CAT[cat] || "오늘"; // 대주제 라벨(있으면), 없으면 계열 약칭
  const fb = pickFactbox(article.factbox, level); // 학년별 팩트박스

  el.innerHTML = `
    ${SPECKLE}
    <header class="topbar">
      <span class="brand">${escapeHtml(SITE_NAME)}<span class="brand-meta">${escapeHtml(formatDate(article.date))} · 제 ${article.issueNo} 호 · <span class="credit">made by Matto</span></span></span>
      <div class="controls">
        <div class="level-toggle" role="group" aria-label="학년 선택">
          ${LEVEL_ORDER.filter((k) => article.body?.[k]).map((k) =>
            `<button type="button" class="lvl" data-level="${k}" aria-pressed="${level === k}">${escapeHtml(LEVELS[k].tab)}</button>`
          ).join("")}
        </div>
        <button type="button" class="tbtn" id="archive-btn">🗂 지난 호</button>
        <button type="button" class="tbtn" id="print-btn">🖨 인쇄</button>
      </div>
    </header>

    <div class="lead">
      <div class="lead-main">
        <div class="badge"><div class="tag"><span class="sm">${escapeHtml(badgeTease)}</span><span class="lg">${escapeHtml(badgeLabel)} 특집</span></div></div>
        <div class="cover-title">
          ${article.titleEn ? `<p class="title-en">${escapeHtml(article.titleEn)}</p>` : ""}
          <h1 class="hook">${escapeHtml(article.title)}</h1>
          <p class="subtitle">${escapeHtml(article.subtitle)}</p>
        </div>
        <p class="intro">${escapeHtml(intro)}</p>
      </div>
      <aside class="lead-side">
        <div class="img-slot" role="img" aria-label="${escapeHtml(article.title)} 그림">
          <img class="cover-img" src="content/img/${article.date}.jpg" alt="" loading="lazy" onerror="this.remove()">
          <span class="img-ph"><span class="em">🖼️</span>그림이 들어갈 자리</span>
        </div>
      </aside>
    </div>

    <div class="story">
      <div id="article-body">${renderStory(article.body[level], article.vocab)}</div>
      ${fb ? `<aside class="callout">
        <svg class="ic" viewBox="0 0 60 60" aria-hidden="true"><circle cx="26" cy="26" r="18" fill="none" stroke="currentColor" stroke-width="6"/><line x1="39" y1="39" x2="54" y2="54" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>
        <h3>${escapeHtml(fb.title || "콕! 알아두기")}</h3>
        <p>${escapeHtml(fb.text)}</p>
      </aside>` : ""}
    </div>

    <div class="cta"><button type="button" class="btn primary big" id="start-quiz">오늘의 문제 풀기 →</button></div>
    <p class="views" hidden></p>
    <footer class="lab">
      <span class="labmark"><i>Matto</i><b>LAB</b></span>
      <span class="labrow"><span class="here">${escapeHtml(SITE_NAME)}</span><span class="dot">·</span><a href="${SIBLING.url}" target="_blank" rel="noopener">${escapeHtml(SIBLING.name)}</a></span>
    </footer>
  `;

  mountVocabTooltips(el, article.vocab);
  el.querySelectorAll(".lvl").forEach((b) =>
    b.addEventListener("click", () => handlers.onLevelChange?.(b.dataset.level))
  );
  el.querySelector("#start-quiz").addEventListener("click", () => handlers.onStartQuiz?.());
  el.querySelector("#print-btn").addEventListener("click", () => handlers.onPrint?.());
  el.querySelector("#archive-btn")?.addEventListener("click", () => handlers.onArchive?.());
  return el;
}

// 지난 호 아카이브 화면. today: 오늘까지 발행된 호만 보여준다(미래 호 숨김).
// 갈래 라벨은 여기 하나뿐이다. 갈래를 늘리면 topics.json과 이 표를 같이 고칠 것.
const CAT_SHORT = { science: "과학", history: "역사", literature: "문학", language: "우리말", tech: "기술", society: "사회", art: "예술", mind: "마음" };
export function renderArchive(manifest, today, { onOpen, onClose } = {}) {
  const el = document.createElement("article");
  el.className = "paper archive";
  const items = [...manifest]
    .filter((it) => !today || it.date <= today)         // 지난 호(오늘까지)만
    .sort((a, b) => b.date.localeCompare(a.date));       // 최신 호부터
  const cats = [...new Set(items.map((it) => it.category))];
  const card = (it) => `
    <button type="button" class="arch-card cat-${escapeHtml(it.category)}" data-date="${escapeHtml(it.date)}" data-cat="${escapeHtml(it.category)}">
      <span class="arch-thumb"><img src="content/img/${escapeHtml(it.date)}.jpg" alt="" loading="lazy" onerror="this.parentElement.remove()"></span>
      <span class="arch-badge">${escapeHtml(it.emoji || "📄")} ${escapeHtml(it.badgeLabel || "")}</span>
      <span class="arch-t">${escapeHtml(it.title)}</span>
      <span class="arch-d">${formatDate(it.date)} · 제 ${it.issueNo}호</span>
    </button>`;
  const chips = items.length ? `<div class="arch-filter" role="group" aria-label="카테고리 고르기">
      <button type="button" class="arch-chip active" data-f="all">전체 ${items.length}</button>
      ${cats.map((c) => `<button type="button" class="arch-chip cat-${escapeHtml(c)}" data-f="${escapeHtml(c)}">${escapeHtml(CAT_SHORT[c] || c)}</button>`).join("")}
    </div>` : "";
  el.innerHTML = `
    ${SPECKLE}
    <header class="topbar">
      <span class="brand">${escapeHtml(SITE_NAME)}<span class="brand-meta">지난 호 모아보기 · 모두 ${items.length}호</span></span>
      <div class="controls"><button type="button" class="tbtn" id="arch-close">← 오늘 호로</button></div>
    </header>
    <h1 class="arch-title">🗂 지난 호</h1>
    ${items.length ? `<p class="arch-sub">읽고 싶은 날의 신문을 골라 보세요. 갈래를 누르면 주제별로 모아 볼 수 있어요.</p>` : ""}
    <div class="arch-layout">
      ${chips}
      ${items.length
        ? `<div class="arch-grid">${items.map(card).join("")}</div>`
        : `<p class="arch-empty">아직 지난 호가 없어요.<br>내일부터 새 신문이 하루에 하나씩 쌓여요! 📚</p>`}
    </div>
    <footer class="lab">
      <span class="labmark"><i>Matto</i><b>LAB</b></span>
      <span class="labrow"><span class="here">${escapeHtml(SITE_NAME)}</span><span class="dot">·</span><a href="${SIBLING.url}" target="_blank" rel="noopener">${escapeHtml(SIBLING.name)}</a></span>
    </footer>`;
  el.querySelector("#arch-close").addEventListener("click", () => onClose?.());
  el.querySelectorAll(".arch-card").forEach((b) => b.addEventListener("click", () => onOpen?.(b.dataset.date)));
  el.querySelectorAll(".arch-chip").forEach((chip) => chip.addEventListener("click", () => {
    el.querySelectorAll(".arch-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    const f = chip.dataset.f;
    el.querySelectorAll(".arch-card").forEach((c) => { c.style.display = (f === "all" || c.dataset.cat === f) ? "" : "none"; });
  }));
  return el;
}

// 낱말 팝업은 화면에 하나만. document 리스너는 1회만 등록(렌더마다 누수 방지).
let _openTip = null;
function _closeTip() {
  if (!_openTip) return;
  _openTip._cleanup?.();
  _openTip.remove();
  _openTip = null;
}
let _docBound = false;
function _bindDocOnce() {
  if (_docBound) return;
  _docBound = true;
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".vocab") && !e.target.closest(".vocab-tip")) _closeTip();
  });
}

export function mountVocabTooltips(root, vocab = []) {
  const map = new Map(vocab.map((v) => [v.word, v]));
  _bindDocOnce();

  // 팝업을 단어 바로 위(공간 없으면 아래)에 띄우고 화살표 위치를 맞춘다.
  const place = (tip, btn) => {
    const r = btn.getBoundingClientRect();
    const sx = window.scrollX, sy = window.scrollY;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const margin = 8;
    const wordCx = r.left + r.width / 2;
    // 가로: 단어 중심에 맞추되 화면 밖으로 나가지 않게 클램프
    let left = wordCx - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    // 세로: 기본은 단어 위, 위 공간이 부족하면 아래로
    const below = r.top < th + 14;
    const top = below ? r.bottom + 10 : r.top - th - 10;
    tip.classList.toggle("below", below);
    tip.style.left = `${left + sx}px`;
    tip.style.top = `${top + sy}px`;
    // 화살표는 항상 단어 중심을 가리키게
    const arrow = Math.max(14, Math.min(wordCx - left, tw - 14));
    tip.style.setProperty("--arrow", `${arrow}px`);
  };

  const reposition = () => { if (_openTip) place(_openTip, _openTip._btn); };

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".vocab");
    if (!btn) { _closeTip(); return; }
    e.stopPropagation();
    const word = btn.dataset.word;
    const wasOpenFor = _openTip && _openTip._word === word;
    _closeTip();
    if (wasOpenFor) return;

    const v = map.get(word) || {};
    const tip = document.createElement("span");
    tip.className = "vocab-tip";
    tip._word = word;
    tip._btn = btn;
    tip.setAttribute("role", "tooltip");
    let html = `<span class="vt-word">${escapeHtml(word)}</span>`;
    html += `<span class="vt-mean">${escapeHtml(v.meaning || "")}</span>`;
    if (v.example) {
      // 예문 속 낱말은 굵게 강조
      const ex = escapeHtml(v.example).replace(
        new RegExp(escapeReg(escapeHtml(word)), "g"), `<b>${escapeHtml(word)}</b>`
      );
      html += `<span class="vt-ex">📎 ${ex}</span>`;
    }
    tip.innerHTML = html;
    document.body.appendChild(tip);
    place(tip, btn);
    _openTip = tip;
    const onScroll = () => reposition();
    const onResize = () => _closeTip();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    tip._cleanup = () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  });
}
