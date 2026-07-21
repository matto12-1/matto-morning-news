// assets/app.js — 진입점: 부팅·라우팅·상태·에러 폴백.
import { loadIndex, loadArticle, loadManifest, pickIssueDate, todayISO } from "./content.js";
import { renderHome, renderArchive, renderStory, mountVocabTooltips } from "./render.js";
import { renderQuiz } from "./quiz.js";
import { openPrintDialog } from "./print.js";
import { SPECKLE } from "./art.js";
import * as tts from "./tts.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const app = document.getElementById("app");
const state = { article: null, level: "lower", view: "home" };

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
      `<div class="read-body">${renderStory(state.article.body[state.level], state.article.vocab)}</div>`;
    mountVocabTooltips(readPane, state.article.vocab);
    enableDragScroll(readPane);

    const quizEl = renderQuiz(state.article, {
      level: state.level,
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
    level: state.level,
    handlers: {
      onLevelChange: (lvl) => { state.level = lvl; render(); },
      onStartQuiz: () => { state.view = "quiz"; render(); },
      onPrint: () => openPrintDialog(state.article, state.level),
      onArchive: () => openArchive(),
    },
  });
  app.appendChild(home);
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

async function openArchive() {
  try { if (!state.manifest) state.manifest = await loadManifest(); }
  catch { state.manifest = []; }
  state.view = "archive";
  render();
}

async function openIssue(date) {
  try {
    state.article = await loadArticle(date);
    state.level = "lower";
    state.view = "home";
    render();
  } catch (err) { renderError(err); }
}

function renderEmpty() {
  app.innerHTML = `
    <div class="fallback">
      <div class="fallback-emoji">🛌</div>
      <h2>오늘은 신문이 쉬어가요</h2>
      <p>내일 아침 새로운 이야기로 다시 만나요!</p>
      <button type="button" class="btn primary" id="empty-archive">🗂 지난 호 보기</button>
    </div>`;
  app.querySelector("#empty-archive")?.addEventListener("click", openArchive);
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
