// assets/quiz.js
// 1부: 채점 순수 함수 (DOM 비의존 → Node 테스트 가능)
// 2부: 퀴즈 렌더/이벤트 (브라우저 전용, renderQuiz) — 파일 하단.

export const normalize = (s) => String(s).replace(/[\s\p{P}]/gu, "").toLowerCase();
export const gradeMC = (item, idx) => idx === item.answerIndex;
export const gradeOX = (item, bool) => bool === item.answer;
export const gradeCloze = (item, text) =>
  Array.isArray(item.acceptable) && item.acceptable.some((a) => normalize(a) === normalize(text));

export function gradeItem(item, answer) {
  switch (item.type) {
    case "mc":
    case "meaning": return gradeMC(item, answer);
    case "ox": return gradeOX(item, answer);
    case "cloze": return gradeCloze(item, answer);
    default: return false;
  }
}

export function scoreSection(items, answers) {
  let correct = 0;
  items.forEach((it, i) => { if (gradeItem(it, answers[i])) correct++; });
  return { correct, total: items.length };
}

// ── 2부: 브라우저 렌더 (Node 테스트에서는 import 되지 않는 함수) ──────────────
// renderQuiz는 DOM API를 쓰므로 브라우저에서만 호출된다.
export function renderQuiz(article, { level, onBack } = {}) {
  const q = article.quiz;
  const root = document.createElement("section");
  root.className = "quiz";
  root.innerHTML = `<h2 class="quiz-title">📝 오늘의 퀴즈</h2>
    <div class="quiz-progress" role="status" aria-live="polite">
      <div class="qp-bar"><span class="qp-fill" style="width:0%"></span></div>
      <span class="qp-label">0 / ${q.comprehension.length + q.vocab.length} 문제</span>
    </div>`;

  const state = { comp: {}, voc: {} };
  const totalGraded = q.comprehension.length + q.vocab.length;
  const updateProgress = () => {
    const done = Object.keys(state.comp).length + Object.keys(state.voc).length;
    const pct = totalGraded ? Math.round((done / totalGraded) * 100) : 0;
    const fill = root.querySelector(".qp-fill");
    const label = root.querySelector(".qp-label");
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = `${done} / ${totalGraded} 문제`;
  };

  const compBlock = buildSection("내용 이해", q.comprehension, state.comp, "comp", updateProgress);
  const vocBlock = buildSection("어휘", q.vocab, state.voc, "voc", updateProgress);
  root.appendChild(compBlock.el);
  root.appendChild(vocBlock.el);
  root.appendChild(buildThink(q.think));
  if (q.bonus) root.appendChild(buildBonus(q.bonus));

  // 결과 요약
  const result = document.createElement("div");
  result.className = "quiz-result";
  root.appendChild(result);

  const footer = document.createElement("div");
  footer.className = "quiz-footer";
  const doneBtn = button("결과 보기 ⭐", "btn primary big");
  const retryBtn = button("다시 풀기 🔄", "btn ghost");
  const backBtn = button("← 기사로 돌아가기", "btn ghost");
  footer.append(doneBtn, retryBtn, backBtn);
  root.appendChild(footer);

  doneBtn.addEventListener("click", () => {
    const c = scoreSection(q.comprehension, orderedAnswers(state.comp, q.comprehension.length));
    const v = scoreSection(q.vocab, orderedAnswers(state.voc, q.vocab.length));
    const total = c.correct + v.correct;
    const max = c.total + v.total;
    const stars = "⭐".repeat(Math.max(1, Math.round((total / max) * 5)));
    result.innerHTML = `
      <div class="reward" role="status">
        <div class="reward-stars">${stars}</div>
        <p class="reward-msg">${praise(total, max)}</p>
        <p class="reward-score">내용 ${c.correct}/${c.total} · 어휘 ${v.correct}/${v.total}</p>
      </div>`;
    result.querySelector(".reward").animate(
      [{ transform: "scale(.7)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 400, easing: "cubic-bezier(.2,.9,.3,1.3)" }
    );
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  retryBtn.addEventListener("click", () => {
    if (onBack) onBack("quiz-retry");
  });
  backBtn.addEventListener("click", () => { if (onBack) onBack("home"); });

  return root;

  // ── 내부 헬퍼 ──
  function buildSection(titleText, items, answerStore, ns, notify) {
    const el = document.createElement("div");
    el.className = "quiz-section";
    el.innerHTML = `<h3>${titleText}</h3>`;
    items.forEach((item, i) => {
      el.appendChild(buildItem(item, i, answerStore, ns, notify));
    });
    return { el };
  }

  function buildItem(item, i, answerStore, ns, notify) {
    const wrap = document.createElement("div");
    wrap.className = "q-item";
    wrap.innerHTML = `<p class="q-text"><span class="q-num">${i + 1}</span> ${escapeHtml(item.question)}</p>`;
    const feedback = document.createElement("p");
    feedback.className = "q-feedback";
    feedback.setAttribute("aria-live", "polite");

    const settle = (ok) => {
      feedback.textContent = (ok ? "정답이에요! " : "다시 생각해볼까요? ") + (item.explain || "");
      feedback.className = "q-feedback " + (ok ? "ok" : "no");
      notify?.();
    };

    if (item.type === "mc" || item.type === "meaning") {
      const opts = document.createElement("div");
      opts.className = "q-choices";
      item.choices.forEach((c, ci) => {
        const b = button(`${"①②③④⑤".charAt(ci) || ci + 1} ${escapeHtml(c)}`, "choice");
        b.addEventListener("click", () => {
          answerStore[i] = ci;
          [...opts.children].forEach((x) => x.classList.remove("selected", "correct", "wrong"));
          b.classList.add("selected");
          const ok = gradeItem(item, ci);
          b.classList.add(ok ? "correct" : "wrong");
          if (!ok) opts.children[item.answerIndex]?.classList.add("correct");
          settle(ok);
        });
        opts.appendChild(b);
      });
      wrap.appendChild(opts);
    } else if (item.type === "ox") {
      const opts = document.createElement("div");
      opts.className = "q-choices ox";
      [["O", true], ["X", false]].forEach(([lbl, val]) => {
        const b = button(lbl, "choice ox-btn");
        b.addEventListener("click", () => {
          answerStore[i] = val;
          [...opts.children].forEach((x) => x.classList.remove("selected", "correct", "wrong"));
          b.classList.add("selected", gradeItem(item, val) ? "correct" : "wrong");
          settle(gradeItem(item, val));
        });
        opts.appendChild(b);
      });
      wrap.appendChild(opts);
    } else if (item.type === "cloze") {
      const row = document.createElement("div");
      row.className = "q-cloze";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cloze-input";
      input.setAttribute("aria-label", "정답 입력");
      input.placeholder = "여기에 답을 써요";
      const check = button("확인", "btn small");
      check.addEventListener("click", () => {
        answerStore[i] = input.value;
        settle(gradeItem(item, input.value));
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") check.click(); });
      row.append(input, check);
      wrap.appendChild(row);
    }

    wrap.appendChild(feedback);
    return wrap;
  }

  function buildThink(think) {
    const el = document.createElement("div");
    el.className = "quiz-section think";
    el.innerHTML = `<h3>💭 생각 넓히기</h3><p class="q-text">${escapeHtml(think.question)}</p>`;
    const ta = document.createElement("textarea");
    ta.className = "think-input";
    ta.rows = 3;
    ta.placeholder = "정답이 없는 질문이에요. 자유롭게 내 생각을 써봐요.";
    ta.setAttribute("aria-label", "생각 넓히기 답");
    const toggle = button("이렇게 생각해볼 수도 있어요 👀", "btn ghost small");
    const model = document.createElement("p");
    model.className = "think-model";
    model.hidden = true;
    model.textContent = think.modelAnswer;
    toggle.addEventListener("click", () => {
      model.hidden = !model.hidden;
      toggle.textContent = model.hidden ? "이렇게 생각해볼 수도 있어요 👀" : "닫기";
    });
    el.append(ta, toggle, model);
    return el;
  }

  function buildBonus(bonus) {
    const el = document.createElement("div");
    el.className = "quiz-section bonus";
    el.innerHTML = `<h3>🎁 보너스</h3><p class="q-text">${escapeHtml(bonus.question || "")}</p>`;
    return el;
  }
}

function orderedAnswers(store, len) {
  const arr = new Array(len);
  for (let i = 0; i < len; i++) arr[i] = store[i];
  return arr;
}

function praise(score, max) {
  const r = score / max;
  if (r >= 1) return "완벽해요! 오늘 글을 아주 잘 읽었어요 🎉";
  if (r >= 0.7) return "잘했어요! 내일도 함께 읽어요 😊";
  if (r >= 0.4) return "좋아요! 한 번 더 읽으면 더 잘 알 수 있어요 💪";
  return "괜찮아요. 기사를 다시 읽고 도전해봐요 🌱";
}

function button(text, cls) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  return b;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
