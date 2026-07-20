// assets/app.js — 진입점: 부팅·라우팅·상태·에러 폴백.
import { loadIndex, loadArticle, pickIssueDate, todayISO } from "./content.js";
import { renderHome } from "./render.js";
import { renderQuiz } from "./quiz.js";
import { openPrintDialog } from "./print.js";
import * as tts from "./tts.js";

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
  if (state.view === "quiz") {
    app.appendChild(
      renderQuiz(state.article, {
        level: state.level,
        onBack: (why) => {
          if (why === "quiz-retry") { state.view = "quiz"; render(); }
          else { state.view = "home"; render(); }
        },
      })
    );
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
    },
  });
  app.appendChild(home);
  wireTts(home);
  wireFontToggle(home);
  focusMain(".headline");
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

function renderEmpty() {
  app.innerHTML = `
    <div class="fallback">
      <div class="fallback-emoji">🛌</div>
      <h2>오늘은 신문이 쉬어가요</h2>
      <p>내일 아침 새로운 이야기로 다시 만나요!</p>
    </div>`;
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
