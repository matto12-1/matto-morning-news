// assets/print.js — 인쇄용 워크시트(학생용/교사용, 저/고 선택).
import { SITE_NAME, LEVELS } from "./config.js";
import { formatDate } from "./render.js";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const paras = (t) => String(t).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join("");

// 옵션 선택 모달을 띄운다. 화면 level을 기본값으로.
export function openPrintDialog(article, defaultLevel = "lower") {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="인쇄 설정">
      <h3>🖨️ 인쇄하기</h3>
      <label class="field">학년
        <select id="pr-level">
          <option value="lower" ${defaultLevel === "lower" ? "selected" : ""}>${LEVELS.lower.label}(${LEVELS.lower.sub})</option>
          <option value="upper" ${defaultLevel === "upper" ? "selected" : ""}>${LEVELS.upper.label}(${LEVELS.upper.sub})</option>
        </select>
      </label>
      <label class="field">종류
        <select id="pr-mode">
          <option value="student">학생용 (문제만)</option>
          <option value="teacher">교사용 (정답·해설 포함)</option>
        </select>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn ghost" id="pr-cancel">취소</button>
        <button type="button" class="btn primary" id="pr-go">인쇄 미리보기</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  function onKey(e) { if (e.key === "Escape") close(); }
  function close() { back.remove(); document.removeEventListener("keydown", onKey); }
  document.addEventListener("keydown", onKey);
  back.querySelector("#pr-level")?.focus();
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.querySelector("#pr-cancel").addEventListener("click", close);
  back.querySelector("#pr-go").addEventListener("click", () => {
    const level = back.querySelector("#pr-level").value;
    const mode = back.querySelector("#pr-mode").value;
    close();
    printWorksheet(article, level, mode);
  });
}

export function printWorksheet(article, level, mode) {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  root.innerHTML = buildWorksheetHtml(article, level, mode);
  document.body.classList.add("printing");
  const cleanup = () => {
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function buildWorksheetHtml(article, level, mode) {
  const teacher = mode === "teacher";
  const q = article.quiz;
  let n = 0;
  const compHtml = q.comprehension.map((it) => renderQ(++n, it, teacher)).join("");
  const vocHtml = q.vocab.map((it) => renderQ(++n, it, teacher)).join("");
  const thinkHtml = `
    <div class="pw-q">
      <p class="pw-qtext"><b>${++n}.</b> ${esc(q.think.question)}</p>
      <div class="pw-lines"></div>
      ${teacher ? `<p class="pw-ans">💡 예시 답안: ${esc(q.think.modelAnswer)}</p>` : ""}
    </div>`;

  return `
    <div class="worksheet">
      <div class="pw-head">
        <div class="pw-brand">${esc(SITE_NAME)} <span>· ${esc(formatDate(article.date))} · 제${article.issueNo}호</span></div>
        <div class="pw-fill">이름 __________  학년/반 __________  ${teacher ? "<b>[교사용 정답지]</b>" : ""}</div>
      </div>
      <h1 class="pw-title">${esc(article.title)}</h1>
      <p class="pw-sub">${esc(article.subtitle)} · ${LEVELS[level].label}(${LEVELS[level].sub})</p>
      <div class="pw-body">${paras(article.body[level])}</div>
      <hr />
      <h2 class="pw-h2">📝 내용 이해</h2>${compHtml}
      <h2 class="pw-h2">🔤 어휘</h2>${vocHtml}
      <h2 class="pw-h2">💭 생각 넓히기</h2>${thinkHtml}
    </div>`;

  function renderQ(num, it, showAns) {
    let opts = "", ans = "";
    if (it.type === "mc" || it.type === "meaning") {
      opts = `<ol class="pw-choices">${it.choices.map((c, i) =>
        `<li class="${showAns && i === it.answerIndex ? "correct" : ""}">${esc(c)}</li>`).join("")}</ol>`;
      if (showAns) ans = `정답 ${it.answerIndex + 1}번` + (it.explain ? ` — ${esc(it.explain)}` : "");
    } else if (it.type === "ox") {
      opts = `<p class="pw-ox">( O / X )</p>`;
      if (showAns) ans = `정답 ${it.answer ? "O" : "X"}` + (it.explain ? ` — ${esc(it.explain)}` : "");
    } else if (it.type === "cloze") {
      opts = `<p class="pw-cloze">답: ____________</p>`;
      if (showAns) ans = `정답 ${esc(it.acceptable[0])}`;
    }
    return `<div class="pw-q">
      <p class="pw-qtext"><b>${num}.</b> ${esc(it.question)}</p>
      ${opts}
      ${showAns && ans ? `<p class="pw-ans">✔ ${ans}</p>` : ""}
    </div>`;
  }
}
