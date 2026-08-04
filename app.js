let currentPaper = null;
let currentSubject = null;
let currentDay = null;
let score = 0;
let answeredCount = 0;
let studyMode = localStorage.getItem('vao-study-mode') || 'study';

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  window.scrollTo(0, 0);
}

function updateDashboardCounts() {
  document.getElementById('p1-count').textContent = SUBJECTS.paper1.subjects.length + ' Topics';
  document.getElementById('p2-count').textContent = SUBJECTS.paper2.subjects.length + ' Topics';
}

function showDashboard() {
  updateDashboardCounts();
  showView('dashboard');
}

function showPaper(paperId) {
  currentPaper = paperId;
  const paper = SUBJECTS[paperId];
  document.getElementById('paper-title').textContent = paper.name;

  const list = document.getElementById('subject-list');
  list.innerHTML = '';

  paper.subjects.forEach(subject => {
    const card = document.createElement('div');
    card.className = 'subject-card' + (subject.days === 0 ? ' locked' : '');
    card.innerHTML = `
      <div class="icon">${subject.icon}</div>
      <div class="info">
        <h3>${subject.name}</h3>
        <p>${subject.days > 0 ? subject.days + ' day available' : 'Coming soon'}</p>
      </div>
      ${subject.days > 0 ? '<span class="days-badge">' + subject.days + ' Day</span>' : ''}
    `;
    if (subject.days > 0) card.onclick = () => showDays(subject.id);
    list.appendChild(card);
  });

  showView('subjects');
}

function showDays(subjectId) {
  currentSubject = subjectId;
  const subject = findSubject(subjectId);
  document.getElementById('subject-title').textContent = subject.name;

  const list = document.getElementById('days-list');
  list.innerHTML = '';

  for (let i = 1; i <= subject.days; i++) {
    const dayQuestions = QUESTIONS[subjectId] && QUESTIONS[subjectId]['day' + i] ? QUESTIONS[subjectId]['day' + i] : [];
    const qCount = dayQuestions.length;
    const subtopics = [...new Set(dayQuestions.map(q => q.subtopic).filter(Boolean))];

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-emoji">📅</div>
      <div class="day-info">
        <h3>Day ${i}</h3>
        <div class="subject-name">${subject.icon} ${subject.name}</div>
        ${subtopics.length ? `
        <div class="day-topics-label">Topics Covered</div>
        <ul class="day-topics-list">
          ${subtopics.map(t => '<li>' + t + '</li>').join('')}
        </ul>
        ` : ''}
        <div class="meta">${qCount} Questions &middot; Estimated Time: ${i * 15} min</div>
      </div>
      <div class="day-arrow">›</div>
    `;
    card.onclick = () => startDay(subjectId, i);
    list.appendChild(card);
  }

  showView('days');
}

function getImportanceStars(n) {
  return '⭐'.repeat(n);
}

function getDifficultyLabel(d) {
  const labels = { beginner: '🟢 Beginner', moderate: '🟡 Moderate', advanced: '🔴 Advanced' };
  return labels[d] || d;
}

function renderQuestions() {
  const questions = QUESTIONS[currentSubject]['day' + currentDay];
  const subject = findSubject(currentSubject);
  const estimatedTime = questions.length * 1.5;
  const isStudy = studyMode === 'study';

  document.getElementById('study-title').innerHTML = `
    Day ${currentDay} — ${subject.name}
    <span class="study-meta">${questions.length} Questions &middot; ~${Math.round(estimatedTime)} min</span>
  `;
  document.getElementById('day-complete-banner').style.display = 'none';

  // Update mode toggle buttons
  document.getElementById('mode-study').classList.toggle('active', isStudy);
  document.getElementById('mode-exam').classList.toggle('active', !isStudy);

  // Show/hide score pill based on mode
  document.getElementById('score-pill').style.display = isStudy ? 'none' : '';

  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  // Quick Jump Panel
  const quickJump = document.createElement('div');
  quickJump.className = 'quick-jump';
  quickJump.innerHTML = `<span class="quick-jump-label">Jump to:</span>`;
  questions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quick-jump-btn';
    btn.id = 'jump-' + idx;
    btn.textContent = idx + 1;
    btn.onclick = () => {
      document.getElementById('q-' + idx).scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    quickJump.appendChild(btn);
  });
  container.appendChild(quickJump);

  // Question Cards
  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = 'q-' + idx;

    const wrongIndices = [];
    for (let j = 0; j < q.options.length; j++) {
      if (j !== q.correct) wrongIndices.push(j);
    }

    if (isStudy) {
      // STUDY MODE: auto-highlight correct, show all explanations
      card.innerHTML = `
        <div class="question-header">
          <span class="question-num">Question ${idx + 1}</span>
          <span class="subtopic-badge">📘 ${q.subtopic || 'General'}</span>
          <span class="difficulty-badge ${q.difficulty}">${getDifficultyLabel(q.difficulty)}</span>
          <span class="importance-badge" title="VAO/KPSC Importance">${getImportanceStars(q.importance || 3)}</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-list" id="opts-${idx}">
          ${q.options.map((opt, i) => `
            <button class="option-btn ${i === q.correct ? 'correct' : 'wrong-option'}" style="cursor:default;">
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
              ${i === q.correct ? '<span class="correct-check">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
        <div class="explanation-card correct-answer">
          <div class="explanation-title">✅ Correct Answer & Explanation</div>
          <p>${q.explanation}</p>
        </div>
        <div class="explanation-card wrong-options">
          <div class="explanation-title">❌ Why every incorrect option is wrong</div>
          ${q.wrongExplanations.map((exp, i) => `
            <div class="wrong-item"><strong>${String.fromCharCode(65 + wrongIndices[i])}:</strong> ${exp}</div>
          `).join('')}
        </div>
        ${q.memoryTrick ? `
        <div class="explanation-card memory-trick">
          <div class="explanation-title">🧠 Memory Trick</div>
          <p>${q.memoryTrick}</p>
        </div>
        ` : ''}
        ${q.examTip ? `
        <div class="explanation-card exam-tip">
          <div class="explanation-title">💡 Exam Tip</div>
          <p>${q.examTip}</p>
        </div>
        ` : ''}
        ${q.didYouKnow ? `
        <div class="explanation-card did-you-know">
          <div class="explanation-title">🌍 Did You Know?</div>
          <p>${q.didYouKnow}</p>
        </div>
        ` : ''}
        ${q.relatedTopics ? `
        <div class="explanation-card related-topics">
          <div class="explanation-title">📚 Related Topics</div>
          <div class="related-tags">
            ${q.relatedTopics.map(t => `<span class="related-tag">${t}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        <div class="explanation-card source-card">
          <div class="explanation-title">📖 Source</div>
          <p class="source-text">${q.source}</p>
        </div>
      `;
    } else {
      // EXAM MODE: no answers, check to reveal
      card.innerHTML = `
        <div class="question-header">
          <span class="question-num">Question ${idx + 1}</span>
          <span class="subtopic-badge">📘 ${q.subtopic || 'General'}</span>
          <span class="difficulty-badge ${q.difficulty}">${getDifficultyLabel(q.difficulty)}</span>
          <span class="importance-badge" title="VAO/KPSC Importance">${getImportanceStars(q.importance || 3)}</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-list" id="opts-${idx}">
          ${q.options.map((opt, i) => `
            <button class="option-btn" onclick="selectOption(${idx}, ${i})" data-qi="${idx}" data-oi="${i}">
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <button class="check-btn" id="check-${idx}" onclick="checkAnswer(${idx})" disabled>Check Answer</button>
          <span id="result-${idx}"></span>
        </div>
        <div id="expl-${idx}" style="display:none;">
          <div class="explanation-card correct-answer">
            <div class="explanation-title">✅ Correct Answer & Explanation</div>
            <p>${q.explanation}</p>
          </div>
          <div class="explanation-card wrong-options">
            <div class="explanation-title">❌ Why every incorrect option is wrong</div>
            ${q.wrongExplanations.map((exp, i) => `
              <div class="wrong-item"><strong>${String.fromCharCode(65 + wrongIndices[i])}:</strong> ${exp}</div>
            `).join('')}
          </div>
          ${q.memoryTrick ? `
          <div class="explanation-card memory-trick">
            <div class="explanation-title">🧠 Memory Trick</div>
            <p>${q.memoryTrick}</p>
          </div>
          ` : ''}
          ${q.examTip ? `
          <div class="explanation-card exam-tip">
            <div class="explanation-title">💡 Exam Tip</div>
            <p>${q.examTip}</p>
          </div>
          ` : ''}
          ${q.didYouKnow ? `
          <div class="explanation-card did-you-know">
            <div class="explanation-title">🌍 Did You Know?</div>
            <p>${q.didYouKnow}</p>
          </div>
          ` : ''}
          ${q.relatedTopics ? `
          <div class="explanation-card related-topics">
            <div class="explanation-title">📚 Related Topics</div>
            <div class="related-tags">
              ${q.relatedTopics.map(t => `<span class="related-tag">${t}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          <div class="explanation-card source-card">
            <div class="explanation-title">📖 Source</div>
            <p class="source-text">${q.source}</p>
          </div>
        </div>
      `;
    }
    container.appendChild(card);
  });
}

function startDay(subjectId, day) {
  currentDay = day;
  currentSubject = subjectId;
  score = 0;
  answeredCount = 0;
  updateScore();
  renderQuestions();
  showView('study');
}

function switchMode(mode) {
  if (studyMode === mode) return;
  studyMode = mode;
  localStorage.setItem('vao-study-mode', mode);

  // Reset score when switching to exam mode
  if (mode === 'exam') {
    score = 0;
    answeredCount = 0;
    updateScore();
  }

  renderQuestions();
}

function selectOption(qIdx, optIdx) {
  if (studyMode === 'study') return;
  const btns = document.querySelectorAll(`#opts-${qIdx} .option-btn`);
  if (btns[0].classList.contains('answered')) return;

  btns.forEach(btn => btn.classList.remove('selected'));
  btns[optIdx].classList.add('selected');
  document.getElementById('check-' + qIdx).disabled = false;
  document.getElementById('check-' + qIdx).dataset.selected = optIdx;
}

function checkAnswer(qIdx) {
  if (studyMode === 'study') return;
  const q = QUESTIONS[currentSubject]['day' + currentDay][qIdx];
  const btns = document.querySelectorAll(`#opts-${qIdx} .option-btn`);
  if (btns[0].classList.contains('answered')) return;

  const selected = parseInt(document.getElementById('check-' + qIdx).dataset.selected);
  const isCorrect = selected === q.correct;

  btns.forEach((btn, i) => {
    btn.classList.add('answered');
    btn.classList.remove('selected');
    if (i === q.correct) btn.classList.add('correct');
    if (i === selected && !isCorrect) btn.classList.add('incorrect');
  });

  document.getElementById('result-' + qIdx).innerHTML = isCorrect
    ? '<span class="result-badge correct">✓ Correct</span>'
    : '<span class="result-badge incorrect">✗ Incorrect</span>';

  document.getElementById('check-' + qIdx).style.display = 'none';
  document.getElementById('expl-' + qIdx).style.display = 'block';

  answeredCount++;
  if (isCorrect) score++;
  updateScore();

  document.getElementById('jump-' + qIdx).classList.add('answered');

  if (answeredCount === QUESTIONS[currentSubject]['day' + currentDay].length) {
    showDayComplete();
  }
}

function updateScore() {
  const total = QUESTIONS[currentSubject] ? QUESTIONS[currentSubject]['day' + currentDay].length : 10;
  document.getElementById('score-pill').textContent = score + ' / ' + total;
}

function showDayComplete() {
  const total = QUESTIONS[currentSubject]['day' + currentDay].length;
  const banner = document.getElementById('day-complete-banner');
  document.getElementById('complete-stats').innerHTML =
    `You scored <strong>${score}</strong> out of <strong>${total}</strong> questions`;
  banner.style.display = 'block';
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function findSubject(subjectId) {
  for (const paperKey of Object.keys(SUBJECTS)) {
    for (const subject of SUBJECTS[paperKey].subjects) {
      if (subject.id === subjectId) return subject;
    }
  }
  return null;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

updateDashboardCounts();
