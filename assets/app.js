// assets/app.js — 진입점: 부팅·라우팅·상태·에러 폴백.
import { loadIndex, loadArticle, loadManifest, pickIssueDate, todayISO, readLevel, saveLevel } from "./content.js";
import { renderHome, renderArchive, renderStory, mountVocabTooltips } from "./render.js";
import { renderQuiz } from "./quiz.js";
import { openPrintDialog } from "./print.js";
import { mountViews } from "./views.js";
import { SPECKLE } from "./art.js";
import * as tts from "./tts.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const app = document.getElementById("app");
const state = { article: null, level: readLevel(), view: "home" };

boot();

async function boot() {
  try {
    const params = new URLSearchParams(location.search);
    const forced = params.get("date"); // 교사용 특정 날짜
    let date = forced;
    if (!date) {
      const index = await loadIndex();
      date = pickIssueDate(index, todayISO());
    }
    if (!date) return renderEmpty();
    state.article = await loadArticle(date);
    render();
  } catch (err) {
    renderError(err);
  }
}

function render() {
  tts.stop();
  app.innerHTML = "";
  // 이 호에 없는 학년 단계(예: 1·2학년 미제작 호)면 이번 화면만 3·4학년으로 폴백한다.
  // 사용자가 고른 state.level 자체는 건드리지 않는다 — 다음 호에서 되살아나야 하므로.
  const level = state.article?.body?.[state.level] ? state.level : "lower";
  if (state.view === "archive") {
    const arch = renderArchive(state.manifest || [], todayISO(), {
      onOpen: (date) => openIssue(date),
      onClose: () => { state.view = "home"; render(); },
    });
    app.appendChild(arch);
    window.scrollTo({ top: 0 });
    state.booted = true;
    return;
  }
  if (state.view === "quiz") {
    const paper = document.createElement("article");
    paper.className = `paper cat-${state.article.category}`;
    paper.innerHTML = SPECKLE;

    const split = document.createElement("div");
    split.className = "quiz-split";

    const readPane = document.createElement("aside");
    readPane.className = "read-pane";
    readPane.innerHTML =
      `<p class="read-h">📖 오늘의 기사 · ${esc(state.article.title)}</p>` +
      `<div class="read-body">${renderStory(state.article.body[level], state.article.vocab)}</div>`;
    mountVocabTooltips(readPane, state.article.vocab);
    enableDragScroll(readPane);

    const quizEl = renderQuiz(state.article, {
      level,
      recommend: pickRecommendations(state.manifest || [], state.article),
      onOpenIssue: (date) => openIssue(date),
      onBack: (why) => {
        if (why === "quiz-retry") { state.view = "quiz"; render(); }
        else { state.view = "home"; render(); }
      },
    });

    split.append(readPane, quizEl);
    paper.appendChild(split);
    app.appendChild(paper);
    window.scrollTo({ top: 0, behavior: "smooth" });
    focusMain(".quiz-title");
    state.booted = true;
    return;
  }

  const home = renderHome(state.article, {
    level,
    handlers: {
      onLevelChange: (lvl) => { state.level = lvl; saveLevel(lvl); render(); },
      onStartQuiz: async () => {
        // 결과 화면의 '다음 기사 추천'에 쓸 지난 호 목록을 미리 확보(실패해도 퀴즈는 진행).
        if (!state.manifest) { try { state.manifest = await loadManifest(); } catch { state.manifest = []; } }
        state.view = "quiz"; render();
      },
      onPrint: async () => {
        // '여러 호 함께 인쇄'에 쓸 지난 호 목록(실패해도 이번 호 인쇄는 된다).
        if (!state.manifest) { try { state.manifest = await loadManifest(); } catch { state.manifest = []; } }
        openPrintDialog(state.article, level, { manifest: state.manifest, today: todayISO(), loadArticle });
      },
      onArchive: () => openArchive(),
    },
  });
  app.appendChild(home);
  mountViews(home);
  wireTts(home);
  wireFontToggle(home);
  focusMain(".hook");
  state.booted = true;
}

// 뷰 전환 시 주요 제목으로 포커스 이동(초기 로딩 때는 제외).
function focusMain(sel) {
  if (!state.booted) return;
  const el = app.querySelector(sel);
  if (el) { el.tabIndex = -1; el.focus({ preventScroll: true }); }
}

function wireTts(root) {
  const btn = root.querySelector("#tts-btn");
  if (!btn || !tts.isSupported()) return;
  btn.hidden = false;
  let speaking = false;
  btn.addEventListener("click", () => {
    if (speaking) { tts.stop(); return; }
    const text = root.querySelector("#article-body")?.innerText || "";
    tts.speak(text, {
      onStart: () => { speaking = true; btn.textContent = "⏹ 멈추기"; btn.setAttribute("aria-pressed", "true"); },
      onEnd: () => { speaking = false; btn.textContent = "🔊 읽어주기"; btn.setAttribute("aria-pressed", "false"); },
    });
  });
}

function wireFontToggle(root) {
  const btn = root.querySelector("#font-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const on = document.documentElement.classList.toggle("bigfont");
    btn.setAttribute("aria-pressed", String(on));
  });
}

// 마우스로 본문을 잡고 끌어서 스크롤(클릭&드래그). 터치는 네이티브 스크롤에 맡긴다.
function enableDragScroll(el) {
  let down = false, moved = false, startY = 0, startTop = 0, suppress = false;
  // 실제로 끈 뒤 발생하는 클릭(낱말 팝업 등)은 한 번 삼킨다.
  el.addEventListener("click", (e) => {
    if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; }
  }, true);
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true; moved = false; suppress = false;
    startY = e.clientY; startTop = el.scrollTop;
    try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
  });
  el.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dy) > 4) { moved = true; el.classList.add("dragging"); }
    if (moved) { el.scrollTop = startTop - dy; e.preventDefault(); }
  });
  const end = () => {
    if (!down) return;
    down = false;
    if (moved) { moved = false; suppress = true; el.classList.remove("dragging"); }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

// 결과 화면 추천: 오늘까지 발행된 다른 호에서 같은 갈래 1편 + 다른 갈래 랜덤으로 최대 3편.
function pickRecommendations(manifest, article, count = 3) {
  const today = todayISO();
  const pool = manifest.filter((it) => it.date <= today && it.date !== article.date);
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
  const same = shuffle(pool.filter((it) => it.category === article.category));
  const rest = shuffle(pool.filter((it) => it.category !== article.category));
  return shuffle([...same.slice(0, 1), ...rest].slice(0, count));
}

async function openArchive() {
  try { if (!state.manifest) state.manifest = await loadManifest(); }
  catch { state.manifest = []; }
  state.view = "archive";
  render();
}

async function openIssue(date) {
  try {
    state.article = await loadArticle(date);
    state.view = "home";
    render();
  } catch (err) { renderError(err); }
}

async function renderEmpty() {
  app.innerHTML = `
    <div class="fallback">
      <div class="fallback-emoji">🛌</div>
      <h2>오늘은 신문이 쉬어가요</h2>
      <p>내일 아침 새로운 이야기로 다시 만나요!</p>
      <button type="button" class="btn primary" id="empty-archive">🗂 지난 호 보기</button>
    </div>`;
  app.querySelector("#empty-archive")?.addEventListener("click", openArchive);
  // 곧 나올 다음 호가 있으면 표지·제목을 예고로 보여준다(실패해도 기본 화면 유지).
  try {
    const manifest = await loadManifest();
    const today = todayISO();
    const next = [...manifest].filter((it) => it.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const btn = app.querySelector("#empty-archive");
    if (!next || !btn) return;
    btn.insertAdjacentHTML("beforebegin", `
      <div class="empty-preview">
        <span class="ep-label">곧 만나요 · 다음 이야기 👀</span>
        <span class="arch-thumb"><img src="content/img/${esc(next.date)}.jpg" alt="" loading="lazy" onerror="this.parentElement.remove()"></span>
        <span class="ep-t">${esc(next.title)}</span>
      </div>`);
  } catch { /* 예고 없이 기본 화면 유지 */ }
}

function renderError(err) {
  app.innerHTML = `
    <div class="fallback">
      <div class="fallback-emoji">😥</div>
      <h2>신문을 불러오지 못했어요</h2>
      <p>${(err && err.message) ? String(err.message) : "잠시 후 다시 시도해 주세요."}</p>
      <button type="button" class="btn primary" onclick="location.reload()">다시 시도</button>
    </div>`;
}
