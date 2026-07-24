// assets/quiz.js
// 1부: 채점 순수 함수 (DOM 비의존 → Node 테스트 가능)
// 2부: 퀴즈 렌더/이벤트 (브라우저 전용, renderQuiz) — 파일 하단.

export const normalize = (s) => String(s).replace(/[\s\p{P}]/gu, "").toLowerCase();
export const gradeMC = (item, idx) => idx === item.answerIndex;
export const gradeOX = (item, bool) => bool === item.answer;
export const gradeCloze = (item, text) =>
  Array.isArray(item.acceptable) && item.acceptable.some((a) => normalize(a) === normalize(text));
// 여러 개 고르기: 고른 인덱스 집합이 정답 집합과 완전히 같아야 정답.
export const gradeMulti = (item, sel) => {
  const want = [...new Set(item.answerIndexes || [])].sort((a, b) => a - b).join(",");
  const got = [...new Set(sel || [])].sort((a, b) => a - b).join(",");
  return want.length > 0 && want === got;
};
// 순서 맞추기: 사용자가 놓은 순서(문자열 배열)가 정답 순서와 같아야 정답.
export const gradeOrder = (item, arr) =>
  Array.isArray(arr) && Array.isArray(item.steps) &&
  arr.length === item.steps.length && arr.every((v, i) => v === item.steps[i]);
// 선긋기: arr[i] = i번째 낱말에 이은 '원래 뜻 인덱스'. 모든 낱말이 제 뜻(arr[i]===i)에 이어져야 정답.
export const gradeMatch = (item, arr) => {
  const n = (item.pairs || []).length;
  return n > 0 && Array.isArray(arr) && arr.length === n && arr.every((v, i) => v === i);
};

export function gradeItem(item, answer) {
  switch (item.type) {
    case "mc":
    case "meaning": return gradeMC(item, answer);
    case "ox": return gradeOX(item, answer);
    case "cloze": return gradeCloze(item, answer);
    case "multi": return gradeMulti(item, answer);
    case "order": return gradeOrder(item, answer);
    case "match": return gradeMatch(item, answer);
    default: return false;
  }
}

export function scoreSection(items, answers) {
  let correct = 0;
  items.forEach((it, i) => { if (gradeItem(it, answers[i])) correct++; });
  return { correct, total: items.length };
}

// 정답을 사람이 읽을 문자열로(결과 화면 '다시 보기'용).
export function correctText(item) {
  switch (item.type) {
    case "mc":
    case "meaning": return item.choices?.[item.answerIndex] ?? "";
    case "ox": return item.answer ? "O (맞아요)" : "X (아니에요)";
    case "cloze": return (item.acceptable || [])[0] || "";
    case "multi": return (item.answerIndexes || []).map((k) => item.choices?.[k]).join(", ");
    case "order": return (item.steps || []).join("  →  ");
    case "match": return (item.pairs || []).map((p) => `${p.word} = ${p.meaning}`).join(" / ");
    default: return "";
  }
}

// ── 2부: 브라우저 렌더 (Node 테스트에서는 import 되지 않는 함수) ──────────────
// 한 문제씩 순차 진행. 답하면 즉시 정오 → '다음 문제'. 마지막에 생각 넓히기 → 결과(+틀린 문제 해설).
export function renderQuiz(article, { level = "lower", onBack, recommend = [], onOpenIssue } = {}) {
  const q = article.quiz || {};

  const comp = Array.isArray(q.comprehension)
    ? q.comprehension
    : (q.comprehension?.[level] || q.comprehension?.lower || []);

  const shown = shownVocab(article, level);
  const vocabQs = buildVocabQuestions(shown);

  const graded = [
    ...comp.map((it) => ({ item: it, section: "내용 이해" })),
    ...vocabQs.map((it) => ({ item: it, section: "낱말 뜻" })),
  ];
  const total = graded.length;
  const answers = new Array(total);
  let answered = 0;

  const root = document.createElement("section");
  root.className = "quiz";
  root.innerHTML = `
    <h1 class="quiz-title">📝 오늘의 퀴즈</h1>
    <div class="quiz-progress" role="status" aria-live="polite">
      <div class="qp-bar"><span class="qp-fill" style="width:0%"></span></div>
      <span class="qp-label">푼 문제 0 / ${total}</span>
    </div>
    <div class="quiz-flow"></div>`;
  const flow = root.querySelector(".quiz-flow");

  const footer = document.createElement("div");
  footer.className = "quiz-footer";
  const backBtn = button("← 기사로 돌아가기", "btn ghost");
  backBtn.addEventListener("click", () => onBack?.("home"));
  footer.appendChild(backBtn);
  root.appendChild(footer);

  const setProgress = () => {
    const pct = total ? Math.round((answered / total) * 100) : 0;
    root.querySelector(".qp-fill").style.width = pct + "%";
    root.querySelector(".qp-label").textContent = `푼 문제 ${answered} / ${total}`;
  };

  const swap = (node) => {
    flow.replaceChildren(node);
    node.animate?.(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
      { duration: 220, easing: "ease-out" }
    );
  };

  showQuestion(0);
  return root;

  // ── 흐름 ──
  function showQuestion(i) {
    if (i >= total) return showThink();
    swap(buildCard(graded[i], i));
  }

  function baseCard(section, i) {
    const card = document.createElement("div");
    card.className = "q-item q-card";
    const count = i >= 0 ? `<span class="q-count">${i + 1}번 문제</span>` : "";
    card.innerHTML = `<div class="q-step"><span class="q-pill">${escapeHtml(section)}</span>${count}</div>`;
    return card;
  }

  function buildCard({ item, section }, i) {
    const card = baseCard(section, i);
    card.insertAdjacentHTML("beforeend", `<p class="q-text">${escapeHtml(item.question)}</p>`);

    const feedback = document.createElement("p");
    feedback.className = "q-feedback";
    feedback.setAttribute("aria-live", "polite");
    const nav = document.createElement("div");
    nav.className = "q-nav";

    let locked = false;
    const settle = (ok) => {
      if (locked) return;
      locked = true;
      answered++;
      setProgress();
      feedback.textContent = (ok ? "정답이에요! " : "아쉬워요. ") + (item.explain || "");
      feedback.className = "q-feedback " + (ok ? "ok" : "no");
      const last = i === total - 1;
      const next = button(last ? "다 풀었어요! 결과 보기 ⭐" : "다음 문제 →", "btn primary");
      next.addEventListener("click", () => showQuestion(i + 1));
      nav.appendChild(next);
      next.focus({ preventScroll: true });
    };

    renderInput(card, item, i, answers, settle);
    card.append(feedback, nav);
    return card;
  }

  function showThink() {
    const think = pickThink(q.think, level);
    const card = baseCard("💭 생각 넓히기", -1);
    card.querySelector(".q-pill").classList.add("think-pill");
    card.insertAdjacentHTML("beforeend", `<p class="q-text">${escapeHtml(think.question)}</p>`);
    const ta = document.createElement("textarea");
    ta.className = "think-input";
    ta.rows = 3;
    ta.placeholder = "정답이 없는 질문이에요. 내 생각을 한 문장 써 봐요.";
    ta.setAttribute("aria-label", "생각 넓히기 답");

    const MIN = 5; // 최소 성의: 빈칸·장난 답이 그냥 넘어가지 않게(채점은 안 함)
    const hint = document.createElement("p");
    hint.className = "think-hint";
    hint.textContent = "내 생각을 한 문장 써 보면 결과를 볼 수 있어요.";

    // 다 쓰면 열리는 '예시답안 + 자기점검' 묶음
    const reveal = document.createElement("div");
    reveal.className = "think-reveal";
    reveal.hidden = true;
    const toggle = button("이렇게 생각해볼 수도 있어요 👀", "btn ghost small");
    const model = document.createElement("p");
    model.className = "think-model";
    model.hidden = true;
    model.textContent = think.modelAnswer;
    const self = document.createElement("div");
    self.className = "think-self";
    self.hidden = true;
    const selfMsg = document.createElement("p");
    selfMsg.className = "think-self-msg";
    selfMsg.setAttribute("aria-live", "polite");
    const bSame = button("네, 담겼어요 😊", "btn ghost small");
    const bDiff = button("조금 달라요 🤔", "btn ghost small");
    bSame.addEventListener("click", () => {
      selfMsg.textContent = "좋아요! 예시와 비슷하게 생각했네요. 스스로 견주어 본 게 멋져요.";
      bSame.classList.add("picked"); bDiff.classList.remove("picked");
    });
    bDiff.addEventListener("click", () => {
      selfMsg.textContent = "괜찮아요! 다르게 생각한 것도 훌륭해요. 내 생각을 가진 게 가장 소중해요.";
      bDiff.classList.add("picked"); bSame.classList.remove("picked");
    });
    const selfRow = document.createElement("div");
    selfRow.className = "think-self-row";
    selfRow.append(bSame, bDiff);
    const selfQ = document.createElement("p");
    selfQ.className = "think-self-q";
    selfQ.textContent = "내 답에도 이런 생각이 담겼나요?";
    self.append(selfQ, selfRow, selfMsg);
    toggle.addEventListener("click", () => {
      const open = model.hidden; // 지금 열리는가
      model.hidden = !open;
      self.hidden = !open;
      toggle.textContent = open ? "닫기" : "이렇게 생각해볼 수도 있어요 👀";
    });
    reveal.append(toggle, model, self);

    const done = button("결과 보기 ⭐", "btn primary big");
    done.disabled = true;
    const gate = () => {
      const ok = ta.value.replace(/\s/g, "").length >= MIN;
      done.disabled = !ok;
      hint.hidden = ok;
      reveal.hidden = !ok; // 한 문장 쓰면 예시답안 비교가 열림
    };
    ta.addEventListener("input", gate);
    done.addEventListener("click", showResult);

    const nav = document.createElement("div");
    nav.className = "q-nav center";
    nav.appendChild(done);
    card.append(ta, hint, reveal, nav);
    swap(card);
  }

  function showResult() {
    const c = scoreSection(comp, answers.slice(0, comp.length));
    const v = scoreSection(vocabQs, answers.slice(comp.length));
    const got = c.correct + v.correct;
    const max = c.total + v.total || 1;
    const stars = "⭐".repeat(Math.max(1, Math.round((got / max) * 5)));

    const card = document.createElement("div");
    card.className = "quiz-result";
    card.innerHTML = `
      <div class="reward" role="status">
        <div class="reward-stars">${stars}</div>
        <p class="reward-msg">${praise(got, max)}</p>
        <p class="reward-score">내용 ${c.correct}/${c.total} · 낱말 ${v.correct}/${v.total}</p>
      </div>`;

    // 틀린 문제 다시 보기(해설)
    const wrongHtml = graded.map(({ item }, idx) => {
      if (gradeItem(item, answers[idx])) return "";
      return `<div class="wr-item">
        <p class="wr-q">${escapeHtml(item.question)}</p>
        <p class="wr-a"><b>정답</b> ${escapeHtml(correctText(item))}</p>
        ${item.explain ? `<p class="wr-e">${escapeHtml(item.explain)}</p>` : ""}
      </div>`;
    }).join("");
    if (wrongHtml) {
      const rev = document.createElement("div");
      rev.className = "wrong-review";
      rev.innerHTML = `<h3>📌 틀린 문제 다시 보기</h3>${wrongHtml}`;
      card.appendChild(rev);
    } else {
      card.insertAdjacentHTML("beforeend", `<p class="all-correct">🎯 모두 맞혔어요! 아주 훌륭해요.</p>`);
    }

    // 다음 기사 추천(지난 호가 있을 때만)
    if (recommend.length && onOpenIssue) {
      const rec = document.createElement("div");
      rec.className = "quiz-recs";
      rec.innerHTML = `<h3>📚 다음엔 이런 이야기 어때요?</h3>
        <div class="rec-grid">${recommend.map((it) => `
          <button type="button" class="arch-card rec-card cat-${escapeHtml(it.category)}" data-date="${escapeHtml(it.date)}">
            <span class="arch-thumb"><img src="content/img/${escapeHtml(it.date)}.jpg" alt="" loading="lazy" onerror="this.parentElement.remove()"></span>
            <span class="arch-badge">${escapeHtml(it.emoji || "📄")} ${escapeHtml(it.badgeLabel || "")}</span>
            <span class="arch-t">${escapeHtml(it.title)}</span>
          </button>`).join("")}</div>`;
      rec.querySelectorAll(".rec-card").forEach((b) => b.addEventListener("click", () => onOpenIssue(b.dataset.date)));
      card.appendChild(rec);
    }

    const nav = document.createElement("div");
    nav.className = "q-nav center";
    const retry = button("다시 풀기 🔄", "btn ghost");
    retry.addEventListener("click", () => onBack?.("quiz-retry"));
    nav.appendChild(retry);
    card.appendChild(nav);

    swap(card);
    card.querySelector(".reward").animate(
      [{ transform: "scale(.7)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 400, easing: "cubic-bezier(.2,.9,.3,1.3)" }
    );
  }

  // ── 유형별 입력 렌더 ──
  function renderInput(card, item, i, answers, settle) {
    const marker = (ci) => "①②③④⑤".charAt(ci) || `${ci + 1}`;

    if (item.type === "mc" || item.type === "meaning") {
      const opts = choiceBox(item.choices, marker);
      [...opts.children].forEach((b, ci) => b.addEventListener("click", () => {
        if (b.disabled) return;
        answers[i] = ci;
        const ok = gradeItem(item, ci);
        b.classList.add("selected", ok ? "correct" : "wrong");
        if (!ok) opts.children[item.answerIndex]?.classList.add("correct");
        [...opts.children].forEach((x) => { if (x !== b) x.disabled = true; });
        settle(ok);
      }));
      card.appendChild(opts);

    } else if (item.type === "ox") {
      const opts = document.createElement("div");
      opts.className = "q-choices ox";
      [["O", true], ["X", false]].forEach(([lbl, val]) => {
        const b = button(lbl, "choice ox-btn");
        b.addEventListener("click", () => {
          if (b.disabled) return;
          answers[i] = val;
          const ok = gradeItem(item, val);
          b.classList.add("selected", ok ? "correct" : "wrong");
          [...opts.children].forEach((x) => { if (x !== b) x.disabled = true; });
          settle(ok);
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);

    } else if (item.type === "cloze") {
      const row = document.createElement("div");
      row.className = "q-cloze";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cloze-input";
      input.setAttribute("aria-label", "정답 입력");
      input.placeholder = "여기에 답을 써요";
      const check = button("확인", "btn small");
      const submit = () => {
        if (check.disabled) return;
        answers[i] = input.value;
        input.disabled = true; check.disabled = true;
        settle(gradeItem(item, input.value));
      };
      check.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      row.append(input, check);
      card.appendChild(row);

    } else if (item.type === "multi") {
      const opts = choiceBox(item.choices, marker);
      const picked = new Set();
      [...opts.children].forEach((b, ci) => b.addEventListener("click", () => {
        if (b.disabled) return;
        if (picked.has(ci)) { picked.delete(ci); b.classList.remove("picked"); }
        else { picked.add(ci); b.classList.add("picked"); }
        check.disabled = picked.size === 0;
      }));
      const hint = document.createElement("p");
      hint.className = "q-hint";
      hint.textContent = "정답을 모두 고른 뒤 확인을 눌러요.";
      const check = button("확인", "btn small");
      check.disabled = true;
      check.addEventListener("click", () => {
        if (check.disabled) return;
        answers[i] = [...picked];
        const ok = gradeItem(item, answers[i]);
        [...opts.children].forEach((x, ci) => {
          x.disabled = true;
          const isAns = (item.answerIndexes || []).includes(ci);
          if (isAns) x.classList.add("correct");
          else if (picked.has(ci)) x.classList.add("wrong");
        });
        check.disabled = true;
        settle(ok);
      });
      const foot = document.createElement("div");
      foot.className = "q-confirm";
      foot.append(hint, check);
      card.append(opts, foot);

    } else if (item.type === "order") {
      const steps = shuffle(item.steps || []);
      const seq = [];
      const pool = document.createElement("div");
      pool.className = "order-pool";
      const seqWrap = document.createElement("div");
      seqWrap.className = "order-seq-wrap";
      const seqEl = document.createElement("ol");
      seqEl.className = "order-seq";
      const empty = document.createElement("p");
      empty.className = "order-empty";
      empty.textContent = "위 조각을 순서대로 눌러요 ↓";
      seqWrap.append(empty, seqEl);
      const drawSeq = () => {
        seqEl.replaceChildren(...seq.map((s) => { const li = document.createElement("li"); li.textContent = s; return li; }));
        empty.hidden = seq.length > 0;
      };
      const check = button("확인", "btn small");
      const reset = button("다시", "btn ghost small");
      check.disabled = true;
      (item.steps || []).length && steps.forEach((s) => {
        const chip = button(s, "order-chip");
        chip.addEventListener("click", () => {
          if (chip.disabled) return;
          seq.push(s); chip.disabled = true; chip.classList.add("used"); drawSeq();
          check.disabled = seq.length !== steps.length;
        });
        pool.appendChild(chip);
      });
      reset.addEventListener("click", () => {
        if (reset.disabled) return;
        seq.length = 0; drawSeq();
        [...pool.children].forEach((c) => { c.disabled = false; c.classList.remove("used"); });
        check.disabled = true;
      });
      check.addEventListener("click", () => {
        if (check.disabled) return;
        answers[i] = seq.slice();
        [...pool.children].forEach((c) => { c.disabled = true; });
        reset.disabled = true; check.disabled = true;
        settle(gradeItem(item, answers[i]));
      });
      const ctrls = document.createElement("div");
      ctrls.className = "order-ctrls";
      ctrls.append(reset, check);
      card.append(pool, seqWrap, ctrls);

    } else if (item.type === "match") {
      const pairs = item.pairs || [];
      const n = pairs.length;
      const arr = new Array(n).fill(-1);         // 낱말 i -> 이은 뜻의 원래 인덱스
      answers[i] = arr;
      const meanOrder = shuffle(pairs.map((_, idx) => idx)); // 뜻 표시 순서(섞음)
      const PC = ["pair-a", "pair-b", "pair-c", "pair-d", "pair-e"];
      const allPC = ["pair-a", "pair-b", "pair-c", "pair-d", "pair-e"];
      let active = -1, locked2 = false;

      const wrap = document.createElement("div"); wrap.className = "match";
      const wordBtns = [], meanBtns = [];

      const redraw = () => {
        wordBtns.forEach((b, wi) => {
          b.classList.remove("active", "linked", ...allPC);
          if (arr[wi] >= 0) b.classList.add("linked", PC[wi]);
          if (wi === active) b.classList.add("active");
        });
        meanBtns.forEach((b) => {
          const orig = Number(b.dataset.orig);
          const wi = arr.indexOf(orig);
          const badge = b.querySelector(".match-badge");
          b.classList.remove("linked", ...allPC);
          if (wi >= 0) { b.classList.add("linked", PC[wi]); badge.textContent = wi + 1; badge.hidden = false; }
          else { badge.hidden = true; }
        });
        check.disabled = arr.some((v) => v < 0);
      };

      pairs.forEach((p, wi) => {
        const b = button(`${"①②③④⑤".charAt(wi) || wi + 1}  ${p.word}`, "match-item word");
        b.addEventListener("click", () => {
          if (locked2) return;
          active = (active === wi) ? -1 : wi;
          redraw();
        });
        wordBtns.push(b);
      });

      meanOrder.forEach((orig) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "match-item mean"; b.dataset.orig = orig;
        b.innerHTML = `<span class="mi-text">${escapeHtml(pairs[orig].meaning)}</span><span class="match-badge" hidden></span>`;
        b.addEventListener("click", () => {
          if (locked2 || active < 0) return;
          const prevW = arr.indexOf(orig);   // 이 뜻에 이미 이어진 낱말 해제
          if (prevW >= 0) arr[prevW] = -1;
          arr[active] = orig;                // active 낱말을 이 뜻에 연결(기존 연결은 덮어씀)
          active = -1;
          redraw();
        });
        meanBtns.push(b);
      });

      // 낱말·뜻을 한 그리드에 행 단위로 배치 — 같은 행은 높이를 공유(뜻이 길어도 행이 어긋나지 않음)
      wordBtns.forEach((w, k) => wrap.append(w, meanBtns[k]));

      const hint = document.createElement("p");
      hint.className = "q-hint";
      hint.textContent = "낱말을 누르고, 알맞은 뜻을 눌러 이어요.";
      const check = button("확인", "btn small");
      check.disabled = true;
      check.addEventListener("click", () => {
        if (check.disabled || locked2) return;
        locked2 = true;
        meanBtns.forEach((b) => {
          const orig = Number(b.dataset.orig);
          const wi = arr.indexOf(orig);
          b.disabled = true;
          b.classList.remove("linked", ...allPC);
          if (wi >= 0) b.classList.add(wi === orig ? "correct" : "wrong");
        });
        wordBtns.forEach((b) => { b.disabled = true; });
        check.disabled = true;
        settle(gradeMatch(item, arr));
      });
      const foot = document.createElement("div");
      foot.className = "q-confirm";
      foot.append(hint, check);
      card.append(wrap, foot);
      redraw();
    }
  }

  function choiceBox(choices, marker) {
    const opts = document.createElement("div");
    opts.className = "q-choices";
    (choices || []).forEach((c, ci) => opts.appendChild(button(`${marker(ci)} ${c}`, "choice")));
    return opts;
  }
}

// ── 낱말 문제 생성 헬퍼 ──
function shownVocab(article, level) {
  const body = article.body?.[level];
  const text = Array.isArray(body) ? body.map((s) => s.text || s).join("\n") : String(body || "");
  return (article.vocab || []).filter((v) => v.word && text.includes(v.word));
}

// 낱말을 4개씩 균형 있게 묶어 '선긋기(짝 잇기)' 문제로 만든다. (모든 낱말을 한두 문제로 해결)
function buildVocabQuestions(vocab) {
  const groups = chunkBalanced(vocab, 4).filter((g) => g.length >= 2);
  const multi = groups.length > 1;
  return groups.map((g, gi) => ({
    type: "match",
    question: multi ? `낱말과 알맞은 뜻을 이어 보세요. (${gi + 1})` : "낱말과 알맞은 뜻을 이어 보세요.",
    pairs: g.map((v) => ({ word: v.word, meaning: v.meaning })),
    explain: g.map((v) => `${v.word}: ${v.meaning}`).join(" / "),
  }));
}

// n개를 최대 maxSize로 최대한 고르게 나눈다. 예) 8→[4,4], 7→[4,3], 5→[3,2].
function chunkBalanced(arr, maxSize) {
  const n = arr.length;
  if (n <= maxSize) return n ? [arr] : [];
  const groups = Math.ceil(n / maxSize);
  const size = Math.ceil(n / groups);
  const out = [];
  for (let i = 0; i < n; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickThink(think, level) {
  if (!think) return { question: "", modelAnswer: "" };
  if (think[level] && think[level].question) return think[level]; // 해당 학년 전용 질문
  if (think.question) return think;                                // 평면 기본(공통)
  return think.lower || think.upper || think.sprout || { question: "", modelAnswer: "" };
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
