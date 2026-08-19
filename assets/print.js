// assets/print.js — 인쇄용 A4 워크시트. 학년·학생/교사·본문/문제·여러 호를 골라 뽑는다.
import { SITE_NAME, LEVELS, LEVEL_ORDER } from "./config.js";
import { formatDate } from "./render.js";
import { shownVocab, buildVocabQuestions } from "./quiz.js";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// 보기 번호. 흑백 인쇄에서 또렷하고 정답 표시(밑줄)와 겹치지 않는다.
const CIRCLE = "①②③④⑤⑥⑦⑧";

// 이 기사가 실제로 갖고 있는 학년 단계만. 화면 토글(render.js)과 같은 규칙.
const levelsOf = (article) => LEVEL_ORDER.filter((k) => article.body?.[k]);
// 여러 호를 한 번에 뽑을 때, 그 학년이 없는 호는 3·4학년으로 내린다.
const levelFor = (article, level) => (article.body?.[level] ? level : "lower");

// ── 인쇄 설정 모달 ────────────────────────────────────────────────
export function openPrintDialog(article, defaultLevel = "lower", opts = {}) {
  const { manifest = [], today = "", loadArticle } = opts;
  // 지난 호만(미래 호 숨김), 최신순. 아카이브 화면과 같은 규칙.
  const others = manifest
    .filter((it) => it.date !== article.date && (!today || it.date <= today))
    .sort((a, b) => b.date.localeCompare(a.date));

  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="인쇄 설정">
      <h3>🖨️ 인쇄하기</h3>
      <label class="field">학년
        <select id="pr-level">
          ${levelsOf(article).map((k) =>
            `<option value="${k}" ${defaultLevel === k ? "selected" : ""}>${esc(LEVELS[k].label)}</option>`).join("")}
        </select>
      </label>
      <label class="field">종류
        <select id="pr-mode">
          <option value="student">학생용 (문제만)</option>
          <option value="teacher">교사용 (정답·해설 포함)</option>
        </select>
      </label>
      <fieldset class="field pr-parts">
        <legend>인쇄할 내용</legend>
        <label><input type="checkbox" id="pr-body" checked> 본문 (읽을거리)</label>
        <label><input type="checkbox" id="pr-quiz" checked> 문제 (학습지)</label>
      </fieldset>
      ${others.length && loadArticle ? `
      <details class="field pr-more">
        <summary>여러 호 함께 인쇄 <span class="pr-count"></span></summary>
        <div class="pr-issues">
          ${others.map((it) =>
            `<label><input type="checkbox" class="pr-issue" value="${esc(it.date)}"> 제${it.issueNo}호 · ${esc(it.title)}</label>`).join("")}
        </div>
      </details>` : ""}
      <div class="modal-actions">
        <button type="button" class="btn ghost" id="pr-cancel">취소</button>
        <button type="button" class="btn primary" id="pr-go">인쇄 미리보기</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  const $ = (sel) => back.querySelector(sel);
  const go = $("#pr-go");
  const bodyCb = $("#pr-body");
  const quizCb = $("#pr-quiz");
  const count = $(".pr-count");

  function sync() {
    const n = back.querySelectorAll(".pr-issue:checked").length;
    if (count) count.textContent = n ? `(이번 호 + ${n}호)` : "";
    // 본문·문제를 둘 다 끄면 뽑을 게 없다.
    go.disabled = !bodyCb.checked && !quizCb.checked;
  }
  back.addEventListener("change", sync);
  sync();

  function onKey(e) { if (e.key === "Escape") close(); }
  function close() { back.remove(); document.removeEventListener("keydown", onKey); }
  document.addEventListener("keydown", onKey);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  $("#pr-cancel").addEventListener("click", close);
  $("#pr-level").focus();

  go.addEventListener("click", async () => {
    const level = $("#pr-level").value;
    const mode = $("#pr-mode").value;
    const parts = { body: bodyCb.checked, quiz: quizCb.checked };
    const extra = [...back.querySelectorAll(".pr-issue:checked")].map((c) => c.value);

    let articles = [article];
    if (extra.length && loadArticle) {
      go.disabled = true;
      go.textContent = "불러오는 중…";
      try {
        const loaded = await Promise.all(extra.map((d) => loadArticle(d)));
        // 날짜순(오래된 호부터)으로 묶어서 뽑는다.
        articles = [article, ...loaded].sort((a, b) => a.date.localeCompare(b.date));
      } catch {
        go.disabled = false;
        go.textContent = "인쇄 미리보기";
        alert("지난 호를 불러오지 못했어요. 이번 호만 인쇄할게요.");
      }
    }
    close();
    printWorksheet(articles, level, mode, parts);
  });
}

// ── 인쇄 실행 ────────────────────────────────────────────────────
export function printWorksheet(articles, level, mode, parts = { body: true, quiz: true }) {
  const list = Array.isArray(articles) ? articles : [articles];
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  root.innerHTML = list.map((a) => buildWorksheetHtml(a, levelFor(a, level), mode, parts)).join("");
  document.body.classList.add("printing");
  const cleanup = () => {
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

// ── 워크시트 HTML ────────────────────────────────────────────────
export function buildWorksheetHtml(article, level, mode, parts = { body: true, quiz: true }) {
  const teacher = mode === "teacher";
  const lv = levelFor(article, level);
  const cls = `page lv-${lv}${teacher ? " is-teacher" : ""}`;
  // 쪽번호 대신 면 이름을 단다. 문항이 많은 학년은 문제가 두 면으로 흐르므로
  // 'n / 2' 같은 고정 쪽번호는 거짓말이 된다.
  const foot = (label) => `<div class="pw-foot">
      <span>${esc(SITE_NAME)} · 제${article.issueNo}호 · ${esc(article.title)}</span>
      <span>${label}${teacher ? " · 교사용 정답지" : ""}</span>
    </div>`;
  const mast = (meta) => `<div class="pw-mast">
      <span class="nm">${esc(SITE_NAME)}</span>
      <span class="meta">${meta}</span>
    </div>`;
  const fill = () => `<div class="pw-fill">
      <div><b>이름</b></div><div><b>학년 / 반</b></div><div><b>푼 날짜</b></div>
      ${teacher ? `<div class="tag"><b>교사용</b>정답·해설</div>` : ""}
    </div>`;

  let html = "";

  if (parts.body) {
    html += `
    <section class="${cls}">
      ${mast(`제${article.issueNo}호 · ${esc(formatDate(article.date))} · ${esc(LEVELS[lv].label)}`)}
      <div class="pw-head">
        <div class="pw-headtxt">
          <h1 class="pw-title">${esc(article.title)}</h1>
          <p class="pw-sub">${esc(article.subtitle)}</p>
          ${fill()}
        </div>
        <img class="pw-illus" src="content/img/${esc(article.date)}.jpg" alt="" onerror="this.remove()">
      </div>
      <div class="pw-body">${bodyToHtml(article.body[lv])}</div>
      ${foot("읽을거리")}
    </section>`;
  }

  if (parts.quiz) {
    const q = article.quiz || {};
    const comp = Array.isArray(q.comprehension)
      ? q.comprehension
      : (q.comprehension?.[lv] || q.comprehension?.lower || []);
    let n = 0;
    const compHtml = comp.map((it) => renderQ(++n, it, teacher)).join("");
    // 낱말 문제는 화면 퀴즈와 같은 규칙: 그 학년 본문에 실제로 나온 낱말만.
    // 종이에서는 5쌍까지 한 문제로 묶는다(화면은 드래그 편의상 4쌍). 낱말 5개짜리 호가 한 면에 들어간다.
    const vocHtml = buildVocabQuestions(shownVocab(article, lv), 5).map((it) => renderQ(++n, it, teacher)).join("");
    const th = q.think || {};
    const think = th[lv]?.question ? th[lv] : (th.question ? th : (th.lower || th.upper || th.sprout || {}));
    // 5·6학년은 문항이 13개라 생각 넓히기가 늘 다음 면으로 넘어간다.
    // 어차피 나가는 면이니 답칸을 넉넉히 줘서 길게 쓰는 면으로 쓴다.
    const lines = { sprout: 3, lower: 4, upper: 8 }[lv] || 4;

    html += `
    <section class="${cls}">
      ${mast(`제${article.issueNo}호 · ${esc(article.title)} · ${esc(LEVELS[lv].label)}`)}
      ${fill()}
      <h2 class="pw-h2">내용 이해</h2>
      <div class="pw-cols">${compHtml}</div>
      ${vocHtml ? `<h2 class="pw-h2">낱말 잇기</h2>${vocHtml}` : ""}
      <h2 class="pw-h2">생각 넓히기</h2>
      <div class="pw-q">
        <p class="pw-qtext"><span class="num">${++n}.</span>${esc(think.question)}</p>
        <div class="pw-write">${'<div class="ln"></div>'.repeat(lines)}</div>
        ${teacher && think.modelAnswer ? `<p class="pw-ans">예시 답안 — ${esc(think.modelAnswer)}</p>` : ""}
      </div>
      ${foot("학습지")}
    </section>`;
  }

  return html;
}

function bodyToHtml(body) {
  const secs = Array.isArray(body) ? body : [{ text: String(body) }];
  return secs.map((s) =>
    (s.heading ? `<h2 class="pw-sec">${esc(s.heading)}</h2>` : "") +
    String(s.text ?? s).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join("")
  ).join("");
}

function renderQ(num, it, teacher) {
  let opts = "", ans = "";
  const choices = (list, isAns) => `<ol class="pw-choices">${list.map((c, i) =>
    `<li class="${teacher && isAns(i) ? "is-ans" : ""}"><span class="mk">${CIRCLE[i] || i + 1}</span>${esc(c)}</li>`).join("")}</ol>`;

  if (it.type === "mc" || it.type === "meaning") {
    opts = choices(it.choices, (i) => i === it.answerIndex);
    if (teacher) ans = `정답 ${CIRCLE[it.answerIndex] || it.answerIndex + 1}` + (it.explain ? ` — ${esc(it.explain)}` : "");
  } else if (it.type === "multi") {
    const set = it.answerIndexes || [];
    opts = choices(it.choices, (i) => set.includes(i));
    if (teacher) ans = `정답 ${set.map((i) => CIRCLE[i] || i + 1).join(" ")}` + (it.explain ? ` — ${esc(it.explain)}` : "");
  } else if (it.type === "ox") {
    opts = `<p class="pw-ox"><span>O</span><span>X</span></p>`;
    if (teacher) ans = `정답 ${it.answer ? "O" : "X"}` + (it.explain ? ` — ${esc(it.explain)}` : "");
  } else if (it.type === "cloze") {
    opts = `<p class="pw-cloze">답 <span class="blank"></span></p>`;
    if (teacher) ans = `정답 ${esc(it.answer || (it.acceptable || [])[0] || "")}` + (it.explain ? ` — ${esc(it.explain)}` : "");
  } else if (it.type === "order") {
    const shown = [...(it.steps || [])].reverse(); // 정답 순서 그대로 노출되지 않게
    opts = `<ul class="pw-order">${shown.map((s) => `<li><span class="box"></span>${esc(s)}</li>`).join("")}</ul>`;
    if (teacher) ans = `정답 순서 ${(it.steps || []).map((s, i) => `${i + 1}. ${esc(s)}`).join(" → ")}`;
  } else if (it.type === "match") {
    const pairs = it.pairs || [];
    const jumbled = pairs.map((_, i) => pairs[(i + 1) % pairs.length]); // 정답끼리 나란히 놓이지 않게
    opts = `<div class="pw-match">
      <ol class="pw-mw">${pairs.map((x) => `<li>${esc(x.word)}</li>`).join("")}</ol>
      <ol class="pw-mm">${jumbled.map((x) => `<li>${esc(x.meaning)}</li>`).join("")}</ol>
    </div>`;
    if (teacher) ans = pairs.map((x) => `${esc(x.word)} — ${esc(x.meaning)}`).join(" / ");
  }

  return `<div class="pw-q">
    <p class="pw-qtext"><span class="num">${num}.</span>${esc(it.question)}</p>
    ${opts}
    ${ans ? `<p class="pw-ans">${ans}</p>` : ""}
  </div>`;
}
