/* Listening practice: lesson data persists; answers stay in the active session. */
(() => {
  const root = document.getElementById('section-listening');
  const ui = {
    view: 'list', lessonId: null, selected: new Set(), draft: null, session: null,
    playbackRate: 1, autoReplay: false, replayLimit: 0, replayInterval: 2, replayCount: 0,
  };
  const esc = escapeHtml;
  const jsonExample = {
    title: 'Daily conversation',
    sentences: [
      { english: 'Could you help me with this?', ipa: '/kʊd juː help miː wɪð ðɪs/', vietnamese: 'Bạn có thể giúp tôi việc này không?' },
      { english: 'I would like a cup of coffee.', ipa: '/aɪ wʊd laɪk ə kʌp əv ˈkɒfi/', vietnamese: 'Tôi muốn một tách cà phê.' },
    ],
  };
  function parseImport(text) {
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch { throw new Error('Invalid JSON. Check brackets, commas, and double quotes.'); }
    if (!data || typeof data.title !== 'string' || !data.title.trim() || data.title.length > 160)
      throw new Error('title must be a lesson name between 1 and 160 characters.');
    if (!Array.isArray(data.sentences) || !data.sentences.length || data.sentences.length > 500)
      throw new Error('sentences must contain between 1 and 500 sentences.');
    const sentences = data.sentences.map((s, i) => {
      if (!s || typeof s.english !== 'string' || !tokens(s.english).length || s.english.length > 1500)
        throw new Error('Sentence ' + (i + 1) + ': english must contain text, up to 1500 characters.');
      for (const field of ['ipa', 'vietnamese']) if (s[field] != null && (typeof s[field] !== 'string' || s[field].length > 3000))
        throw new Error('Sentence ' + (i + 1) + ': ' + field + ' must be a string, up to 3000 characters.');
      return { id: uid('sentence'), english: s.english.trim(), ipa: (s.ipa || '').trim(), vietnamese: (s.vietnamese || '').trim() };
    });
    return { id: uid('listening'), title: data.title.trim(), createdAt: Date.now(), sentences };
  }
  function openImport() {
    ui.view = 'import';
    root.innerHTML = '<h1>Import Listening Typing</h1><div class="lt-import"><p>Choose a .json file or paste its contents below. Each file creates one lesson.</p>' +
      '<div class="lt-toolbar"><label class="btn btn-secondary">Choose JSON File<input type="file" id="lt-json-file" accept=".json,application/json" hidden></label>' +
      button('copy-json', 'Copy Sample JSON') + '<span id="lt-copy-status" role="status"></span></div>' +
      '<label for="lt-json">JSON Content</label><textarea class="input" id="lt-json" spellcheck="false" placeholder="Paste JSON here…"></textarea>' +
      '<p class="field-hint">Schema: title (lesson name), sentences (list of sentences); each sentence contains english, ipa, and vietnamese. IPA and translation may be empty.</p>' +
      '<details><summary>View Sample JSON</summary><pre>' + esc(JSON.stringify(jsonExample, null, 2)) + '</pre></details>' +
      '<p id="lt-import-error" role="alert"></p><div class="lt-toolbar">' + button('import-json', 'Import Lesson', true) + button('list', 'Cancel') + '</div></div>';
  }
  const button = (action, label, primary = false, extra = '') =>
    '<button type="button" class="btn ' + (primary ? 'btn-primary' : 'btn-secondary') + '" data-lt="' + action + '" ' + extra + '>' + label + '</button>';
  const trashIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  const editIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  const editIconButton = id => '<button type="button" class="btn btn-ghost btn-icon" data-lt="edit" data-id="' + esc(id) + '" aria-label="Edit" title="Edit">' + editIcon + '</button>';
  const deleteIconButton = id => '<button type="button" class="btn btn-ghost btn-icon" data-lt="delete" data-id="' + esc(id) + '" aria-label="Delete" title="Delete">' + trashIcon + '</button>';
  let audioGeneration = 0, audio = null, audioUrl = null, autoReplayTimer = null, noteSaveTimer = null;
  function stopAudio() {
    audioGeneration++;
    if (autoReplayTimer) { clearTimeout(autoReplayTimer); autoReplayTimer = null; }
    window.speechSynthesis?.cancel();
    if (audio) { audio.pause(); audio = null; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  }
  function audioStatus(message) {
    const el = root.querySelector('#lt-audio-status');
    if (el) el.textContent = message;
  }
  function scheduleAutoReplay(generation) {
    if (generation !== audioGeneration) return;
    if (!ui.autoReplay || (ui.replayLimit > 0 && ui.replayCount >= ui.replayLimit)) {
      audioStatus('Playback finished. You can listen again.');
      return;
    }
    const seconds = Math.min(60, Math.max(0.5, Number(ui.replayInterval) || 2));
    audioStatus('Replaying in ' + seconds + ' seconds…');
    autoReplayTimer = setTimeout(() => {
      if (generation !== audioGeneration || !ui.autoReplay) return;
      ui.replayCount++;
      play(false);
    }, seconds * 1000);
  }
  async function play(manual = true) {
    const entry = ui.session?.entries[ui.session.index];
    if (!entry) return;
    if (manual) ui.replayCount = 0;
    stopAudio();
    const generation = audioGeneration;
    audioStatus('Preparing audio…');
    if (isPiperConfigured()) {
      try {
        const result = await window.api.piperSpeak({ ...state.piperConfig, text: entry.sentence.english, rate: ui.playbackRate });
        if (generation !== audioGeneration) return;
        if (result?.audioBase64 && !result.error) {
          audioUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0))], { type: 'audio/wav' }));
          audio = new Audio(audioUrl);
          audio.onended = () => scheduleAutoReplay(generation);
          await audio.play();
          if (generation !== audioGeneration) return;
          audioStatus('Playing…');
          return;
        }
      } catch { /* Fall back to a system English voice. */ }
    }
    if (generation !== audioGeneration) return;
    if (!window.speechSynthesis) { audioStatus('No voice is available. Configure Piper in Settings.'); return; }
    const utterance = new SpeechSynthesisUtterance(entry.sentence.english);
    utterance.lang = 'en-US';
    utterance.rate = ui.playbackRate;
    utterance.onend = () => scheduleAutoReplay(generation);
    utterance.onerror = () => { if (generation === audioGeneration) audioStatus('Unable to play audio. Try Listen Again or check your voice settings.'); };
    window.speechSynthesis.speak(utterance);
    audioStatus('Playing…');
  }
  function tokens(text) {
    return text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) || [];
  }
  // Word-level edit distance keeps later words aligned after a missing/extra word.
  function grade(expected, answer) {
    const a = tokens(expected), b = tokens(answer);
    const d = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
    for (let i = 0; i <= a.length; i++) d[i][0] = i;
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    const diff = [];
    let i = a.length, j = b.length;
    while (i || j) {
      if (i && j && d[i][j] === d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)) {
        diff.push({ kind: a[i-1] === b[j-1] ? 'correct' : 'wrong', expected: a[--i], actual: b[--j] });
      } else if (i && d[i][j] === d[i-1][j] + 1) diff.push({ kind: 'missing', expected: a[--i], actual: '' });
      else diff.push({ kind: 'extra', expected: '', actual: b[--j] });
    }
    return { score: Math.round(100 * Math.max(0, 1 - d[a.length][b.length] / Math.max(1, a.length))), correct: d[a.length][b.length] === 0 && a.length > 0, diff: diff.reverse() };
  }
  function saveBestScores(entries, includeBlank = false) {
    const current = lesson();
    if (!current) return;
    let changed = false;
    for (const entry of entries) {
      if (!includeBlank && !entry.answer.trim()) continue;
      const sentence = current.sentences.find(s => s.id === entry.sentence.id && s.english === entry.sentence.english);
      if (!sentence) continue;
      const score = grade(sentence.english, entry.answer).score;
      if (!Number.isFinite(sentence.bestScore) || score > sentence.bestScore) {
        sentence.bestScore = score;
        changed = true;
      }
    }
    if (changed) persist();
  }
  function recordCheck(entry) {
    const current = lesson();
    const sentence = current?.sentences.find(s => s.id === entry.sentence.id && s.english === entry.sentence.english);
    if (!sentence) return;
    sentence.attemptCount = Math.max(0, Number(sentence.attemptCount) || 0) + 1;
    const score = grade(sentence.english, entry.answer).score;
    if (!Number.isFinite(sentence.bestScore) || score > sentence.bestScore) sentence.bestScore = score;
    entry.sentence.attemptCount = sentence.attemptCount;
    entry.sentence.bestScore = sentence.bestScore;
    persist();
  }
  function feedback(entry) {
    const result = grade(entry.sentence.english, entry.answer);
    return '<div class="lt-feedback" aria-live="polite"><strong>' + (result.correct ? 'Correct' : 'Incorrect') + ' · ' + result.score + '%</strong>' +
      '<p class="lt-diff" data-lt-selectable="comparison">' + result.diff.map(x => '<span class="lt-' + x.kind + '">' +
      esc(x.kind === 'wrong' ? x.actual + ' → ' + x.expected : x.kind === 'missing' ? '+ ' + x.expected : x.kind === 'extra' ? '− ' + x.actual : x.expected) + '</span>').join(' ') +
      '</p><p><b>Correct sentence:</b> <span data-lt-selectable="reference">' + esc(entry.sentence.english) + '</span></p><p class="lt-ipa" data-lt-selectable="ipa">' + esc(entry.sentence.ipa || '—') +
      '</p><p data-lt-selectable="meaning">' + esc(entry.sentence.vietnamese || '—') + '</p></div>';
  }
  function lesson() { return state.listeningLessons.find(l => l.id === ui.lessonId); }
  function bestScoreRing(score, label = 'Best score', extraClass = '') {
    if (!Number.isFinite(score)) return '—';
    const value = Math.min(100, Math.max(0, Math.round(score)));
    return '<div class="lt-score-ring ' + extraClass + '" style="--score: ' + value + '" role="img" aria-label="' + label + ': ' + value + ' percent">' +
      '<span>' + value + '<small>%</small></span></div>';
  }
  function lessonProgress(currentLesson) {
    const sentences = currentLesson.sentences || [];
    const practiced = sentences.filter(s => Math.max(0, Number(s.attemptCount) || 0) > 0).length;
    const score = sentences.length
      ? Math.round(sentences.reduce((sum, s) => sum + (Number.isFinite(s.bestScore) ? Math.min(100, Math.max(0, s.bestScore)) : 0), 0) / sentences.length)
      : 0;
    return { score, practiced, total: sentences.length };
  }
  function captureSelection() {
    if (state.section !== 'listening' || ui.view !== 'practice') return;
    const answer = root.querySelector('#lt-answer');
    let text, start, end, excerpt, rect, field;
    if (document.activeElement === answer && answer.selectionEnd > answer.selectionStart) {
      start = answer.selectionStart; end = answer.selectionEnd;
      excerpt = answer.value;
      text = excerpt.slice(start, end).trim();
      rect = answer; field = 'answer';
    } else {
      const selection = window.getSelection();
      if (!selection.rangeCount || !selection.toString().trim()) { hideSelectionMenu(); return; }
      const range = selection.getRangeAt(0);
      const el = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      const content = el.closest('[data-lt-selectable]');
      if (!content || !root.contains(content)) { hideSelectionMenu(); return; }
      ({start, end} = rangeToOffsets(content, range));
      text = selection.toString().trim(); excerpt = content.textContent;
      rect = range; field = content.dataset.ltSelectable;
    }
    if (!text) { hideSelectionMenu(); return; }
    const entry = ui.session.entries[ui.session.index];
    state.pendingSelection = {text, start, end, excerpt, source: {lessonId: ui.lessonId, sentenceId: entry.sentence.id, field, start, end}};
    state.editingHighlightId = null;
    root.querySelector('#lt-audio-status').textContent = '';
    for (const id of ['btn-sel-lookup','btn-sel-translate','btn-sel-pronounce']) document.getElementById(id).hidden = false;
    document.getElementById('btn-sel-remove').hidden = true;
    document.querySelectorAll('#selection-menu .sel-swatch, #selection-menu .sel-menu-divider').forEach(el => { el.hidden = true; });
    showSelectionMenuAt(rect);
  }
  function sentenceRow(s = {}) {
    return '<div class="lt-editor-row" data-id="' + esc(s.id || uid('sentence')) + '">' +
      '<label>English Sentence *<textarea class="input" data-field="english" required maxlength="1500" rows="2">' + esc(s.english || '') + '</textarea></label>' +
      '<label>IPA<input class="input" data-field="ipa" value="' + esc(s.ipa || '') + '"></label>' +
      '<label>Vietnamese Meaning<textarea class="input" data-field="vietnamese" rows="2">' + esc(s.vietnamese || '') + '</textarea></label>' +
      button('remove-row', 'Remove Sentence') + '</div>';
  }
  function render() {
    hideSelectionMenu();
    if (ui.view === 'editor' || ui.view === 'import') return;
    if (ui.view === 'list') {
      root.innerHTML = '<div class="head-row"><div><h1>Listening Typing</h1><p>Listen to English, type what you hear, and review your answers.</p></div><div class="lt-header-actions">' + button('import', 'Import JSON') + button('new', 'New Listening Practice', true) +
        '</div></div><table class="table lt-lessons-table"><thead><tr><th>Title</th><th>Sentences</th><th>Created</th><th class="lt-progress-header">Practice Progress</th><th></th></tr></thead><tbody>' +
        state.listeningLessons.map(l => {
          const progress = lessonProgress(l);
          return '<tr><td>' + button('open', esc(l.title), false, 'data-id="' + esc(l.id) + '"') +
            '</td><td>' + l.sentences.length + '</td><td>' + new Date(l.createdAt).toLocaleDateString('en-GB') + '</td><td class="lt-overall-progress-cell"><div class="lt-overall-progress">' +
            bestScoreRing(progress.score, 'Overall practice progress', 'lt-score-ring-compact') + '<small>' + progress.practiced + '/' + progress.total + ' practiced</small></div></td><td><div class="lt-row-actions">' +
            editIconButton(l.id) + deleteIconButton(l.id) + '</div></td></tr>';
        }).join('') +
        '</tbody></table>' + (!state.listeningLessons.length ? '<div class="lt-empty">No lessons yet. Create a lesson or import a JSON file to get started.</div>' : '');
      return;
    }
    const l = lesson();
    if (!l) { ui.view = 'list'; render(); return; }
    if (ui.view === 'detail') {
      root.innerHTML = button('list', '← Back to Lessons') + '<div class="head-row"><div><h1>' + esc(l.title) + '</h1><p>' + l.sentences.length + ' practice sentences</p></div>' + button('edit', 'Edit Lesson') + '</div>' +
        '<div class="lt-toolbar"><label><input type="checkbox" id="lt-select-all" ' + (ui.selected.size === l.sentences.length ? 'checked' : '') + '> Select All</label><span id="lt-selection-count"></span>' +
        button('start', 'Start Practice', true, 'id="lt-start"') + '</div><table class="table"><thead><tr><th>Select</th><th>English Sentence</th><th>IPA</th><th>Vietnamese Meaning</th><th class="col-num">Attempts</th><th class="col-num">Best Score</th></tr></thead><tbody>' +
        l.sentences.map(s => '<tr><td><input type="checkbox" data-sentence="' + esc(s.id) + '" aria-label="Select sentence ' + esc(s.english) + '" ' + (ui.selected.has(s.id) ? 'checked' : '') + '></td><td>' +
        esc(s.english) + '</td><td class="lt-ipa">' + esc(s.ipa || '—') + '</td><td>' + esc(s.vietnamese || '—') + '</td><td class="col-num lt-attempt-count">' + Math.max(0, Number(s.attemptCount) || 0) + '</td><td class="col-num lt-best-score-cell">' + bestScoreRing(s.bestScore) + '</td></tr>').join('') + '</tbody></table>';
      updateSelection();
      return;
    }
    const session = ui.session;
    if (ui.view === 'results') {
      const grades = session.entries.map(e => grade(e.sentence.english, e.answer));
      const average = Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length);
      root.innerHTML = button('detail', '← Back to Sentences') + '<div class="head-row"><h1>Results · ' + esc(l.title) + '</h1>' + button('restart', 'Practice Again', true) + '</div>' +
        '<div class="lt-summary"><strong>' + average + '%</strong><span>' + grades.filter(g => g.correct).length + '/' + grades.length + ' correct · ' + session.entries.filter(e => !e.answer.trim()).length + ' unanswered</span></div>' +
        '<p class="field-hint">Average score across sentences. Case and punctuation are ignored; missing, extra, and incorrect words reduce your score.</p>' +
        session.entries.map((e, index) => '<article class="lt-result"><div class="lt-toolbar"><h2>Sentence ' + (index + 1) + '</h2>' +
        button('review', 'Review Sentence', false, 'data-index="' + index + '"') + '</div><p><b>Your answer:</b> ' + esc(e.answer || '(Unanswered)') + '</p>' + feedback(e) + '</article>').join('');
      return;
    }
    const entry = session.entries[session.index];
    const takes = (l.pronunciationRecordings || []).filter(t => t.sentenceId === entry.sentence.id);
    const savedTerms = [...new Map(takes.map(t => [t.text + ':' + t.field + ':' + t.start + ':' + t.end, t])).values()];
    root.innerHTML = button('detail', '← Back to Sentences') + '<div class="head-row"><h1>' + esc(l.title) + '</h1><span>Sentence ' + (session.index + 1) + ' / ' + session.entries.length + '</span></div>' +
      '<div class="lt-practice"><div class="lt-practice-grid"><main class="lt-practice-main"><p>Listen to the sentence and type it in English.</p><div class="lt-listen-controls">' + button('play', '▶ Listen Again', true) +
      '<div class="seg lt-speed" role="group" aria-label="Playback speed">' +
      [['0.75', 'Slow'], ['1', 'Normal'], ['1.25', 'Fast']].map(([value, label]) => '<label class="seg-opt"><input type="radio" name="lt-speed" value="' + value + '" ' + (ui.playbackRate === Number(value) ? 'checked' : '') + '>' + label + '</label>').join('') +
      '</div><span id="lt-audio-status" role="status"></span></div>' +
      '<div class="lt-auto-replay"><label><input type="checkbox" id="lt-auto-replay" ' + (ui.autoReplay ? 'checked' : '') + '> Auto replay</label>' +
      '<label>Repeats <select class="input" id="lt-replay-limit" ' + (ui.autoReplay ? '' : 'disabled') + '><option value="0" ' + (ui.replayLimit === 0 ? 'selected' : '') + '>Unlimited</option>' +
      [1, 2, 3, 5, 10].map(value => '<option value="' + value + '" ' + (ui.replayLimit === value ? 'selected' : '') + '>' + value + '</option>').join('') + '</select></label>' +
      '<label>Interval <span><input class="input" id="lt-replay-interval" type="number" min="0.5" max="60" step="0.5" value="' + ui.replayInterval + '" ' + (ui.autoReplay ? '' : 'disabled') + '> seconds</span></label></div>' +
      '<label for="lt-answer">Your Answer</label><textarea class="input" id="lt-answer" rows="4" maxlength="3000" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Type what you hear…">' + esc(entry.answer) + '</textarea>' +
      '<div class="lt-toolbar">' + button('check', 'Check Answer') + button('next', session.index === session.entries.length - 1 ? 'Finish →' : 'Next →', true) + button('results', 'View All Results') +
      '</div><p class="field-hint">Select text in your answer or the revealed result to look up, translate, listen, or record (Alt+R).</p><p class="field-hint">Case and punctuation are ignored. Answers stay hidden until you check them.</p><div id="lt-feedback">' + (entry.revealed ? feedback(entry) : '') + '</div>' +
      (savedTerms.length ? '<div class="lt-saved-recordings"><h3>Saved Recordings</h3><div class="lt-toolbar">' + savedTerms.map(t => button('recordings', esc(t.text), false, 'data-id="' + esc(t.id) + '"')).join('') + '</div></div>' : '') +
      '</main><aside class="lt-note-panel"><label for="lt-note">Notes</label><textarea class="input" id="lt-note" maxlength="10000" placeholder="Write anything about this sentence…">' + esc(entry.sentence.note || '') + '</textarea><p class="field-hint">Saved automatically for this sentence.</p></aside></div></div>';
  }
  function updateSelection() {
    const l = lesson(), count = ui.selected.size;
    root.querySelector('#lt-selection-count').textContent = count + '/' + l.sentences.length + ' selected';
    root.querySelector('#lt-start').disabled = count === 0;
    const all = root.querySelector('#lt-select-all');
    all.checked = count === l.sentences.length && count > 0;
    all.indeterminate = count > 0 && count < l.sentences.length;
  }
  function editLesson(existing) {
    ui.draft = existing || null;
    ui.view = 'editor';
    root.innerHTML = '<h1>' + (existing ? 'Edit Lesson' : 'New Lesson') + '</h1><form id="lt-form">' +
      '<label class="lt-title-label">Title *<input class="input" id="lt-title" required maxlength="160" value="' + esc(existing?.title || '') + '"></label>' +
      '<p class="field-hint">Add English sentences, IPA, and Vietnamese meanings to review after checking your answers.</p><div id="lt-rows">' +
      (existing?.sentences || [{}]).map(sentenceRow).join('') + '</div><div class="lt-toolbar">' + button('add-row', '+ Add Sentence') +
      '<button class="btn btn-primary" type="submit">Save Lesson</button>' + button('cancel-edit', 'Cancel') + '</div><p id="lt-form-error" role="alert"></p></form>';
    root.querySelector('#lt-title').focus();
  }
  function practiceWeight(sentence) {
    const attempts = Math.max(0, Number(sentence.attemptCount) || 0);
    if (attempts === 0 || !Number.isFinite(sentence.bestScore)) return 1000;
    const score = Math.min(100, Math.max(0, Number(sentence.bestScore)));
    // Lower scores dominate; among strong sentences, fewer attempts get a boost.
    return 1 + Math.pow((100 - score) / 10, 2) + 8 / (attempts + 1);
  }
  function weightedPracticeOrder(sentences, random = Math.random) {
    const remaining = [...sentences];
    const ordered = [];
    while (remaining.length) {
      const weights = remaining.map(practiceWeight);
      let pick = random() * weights.reduce((sum, weight) => sum + weight, 0);
      let index = weights.length - 1;
      for (let i = 0; i < weights.length; i++) {
        pick -= weights[i];
        if (pick < 0) { index = i; break; }
      }
      ordered.push(remaining.splice(index, 1)[0]);
    }
    return ordered;
  }
  function start(entries) {
    stopAudio();
    const shuffled = weightedPracticeOrder(entries).map(s => ({ sentence: { ...s }, answer: '', revealed: false }));
    if (!shuffled.length) return;
    ui.session = { entries: shuffled, index: 0 };
    ui.view = 'practice'; render(); root.querySelector('#lt-answer').focus(); play();
  }
  root.addEventListener('submit', e => {
    if (e.target.id !== 'lt-form') return;
    e.preventDefault();
    const title = root.querySelector('#lt-title').value.trim();
    const sentences = [...root.querySelectorAll('.lt-editor-row')].map(row => ({ id: row.dataset.id, ...Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el => [el.dataset.field, el.value.trim()])) }));
    if (!title || !sentences.length || sentences.some(s => !s.english || !tokens(s.english).length)) { root.querySelector('#lt-form-error').textContent = 'Enter a lesson title and at least one valid English sentence.'; return; }
    for (const sentence of sentences) {
      const previous = ui.draft?.sentences.find(s => s.id === sentence.id && s.english === sentence.english);
      if (Number.isFinite(previous?.bestScore)) sentence.bestScore = previous.bestScore;
      if (Number.isFinite(previous?.attemptCount)) sentence.attemptCount = previous.attemptCount;
      if (typeof previous?.note === 'string') sentence.note = previous.note;
    }
    const saved = { ...ui.draft, id: ui.draft?.id || uid('listening'), createdAt: ui.draft?.createdAt || Date.now(), title, sentences };
    const index = state.listeningLessons.findIndex(l => l.id === saved.id);
    if (index < 0) state.listeningLessons.unshift(saved); else state.listeningLessons[index] = saved;
    persist(); ui.lessonId = saved.id; ui.selected = new Set(); ui.session = null; ui.view = 'detail'; render();
  });
  root.addEventListener('input', e => {
    hideSelectionMenu();
    if (e.target.id === 'lt-answer') {
      const entry = ui.session.entries[ui.session.index];
      entry.answer = e.target.value; entry.revealed = false;
      root.querySelector('#lt-feedback').innerHTML = '';
    } else if (e.target.id === 'lt-note') {
      const entry = ui.session.entries[ui.session.index];
      entry.sentence.note = e.target.value;
      const sentence = lesson()?.sentences.find(s => s.id === entry.sentence.id);
      if (sentence) sentence.note = e.target.value;
      clearTimeout(noteSaveTimer);
      noteSaveTimer = setTimeout(() => persist(), 300);
    }
  });
  root.addEventListener('mouseup', captureSelection);
  root.addEventListener('select', e => { if (e.target.id === 'lt-answer') captureSelection(); });
  root.addEventListener('keyup', e => { if (e.key.startsWith('Arrow') || e.key === 'Shift') captureSelection(); });
  root.addEventListener('change', async e => {
    if (e.target.name === 'lt-speed') {
      ui.playbackRate = Number(e.target.value);
      play();
      return;
    }
    if (e.target.id === 'lt-auto-replay') {
      ui.autoReplay = e.target.checked;
      ui.replayCount = 0;
      root.querySelector('#lt-replay-limit').disabled = !ui.autoReplay;
      root.querySelector('#lt-replay-interval').disabled = !ui.autoReplay;
      if (!ui.autoReplay && autoReplayTimer) { clearTimeout(autoReplayTimer); autoReplayTimer = null; audioStatus('Auto replay turned off.'); }
      return;
    }
    if (e.target.id === 'lt-replay-limit') {
      ui.replayLimit = Math.max(0, Number(e.target.value) || 0);
      ui.replayCount = 0;
      return;
    }
    if (e.target.id === 'lt-replay-interval') {
      ui.replayInterval = Math.min(60, Math.max(0.5, Number(e.target.value) || 2));
      e.target.value = ui.replayInterval;
      return;
    }
    if (e.target.id === 'lt-json-file') {
      const file = e.target.files[0];
      if (!file) return;
      const target = root.querySelector('#lt-json');
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error('JSON files must be 5 MB or smaller.');
        const text = await file.text();
        if (!target.isConnected) return;
        target.value = text;
        root.querySelector('#lt-import-error').textContent = '';
      } catch (err) { if (target.isConnected) root.querySelector('#lt-import-error').textContent = err.message; }
      return;
    }
    if (e.target.id === 'lt-select-all') ui.selected = new Set(e.target.checked ? lesson().sentences.map(s => s.id) : []);
    else if (e.target.dataset.sentence) { const id = e.target.dataset.sentence; e.target.checked ? ui.selected.add(id) : ui.selected.delete(id); }
    else return;
    root.querySelectorAll('[data-sentence]').forEach(el => { el.checked = ui.selected.has(el.dataset.sentence); }); updateSelection();
  });
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-lt]');
    if (!btn) return;
    switch (btn.dataset.lt) {
      case 'recordings': {
        const take = lesson().pronunciationRecordings.find(t => t.id === btn.dataset.id);
        if (take) openPronunciationPractice({term:take.text, ipa:take.expectedIpa, source:{lessonId:ui.lessonId, sentenceId:take.sentenceId, field:take.field, start:take.start, end:take.end}});
        break;
      }
      case 'import': openImport(); break;
      case 'copy-json':
        navigator.clipboard.writeText(JSON.stringify(jsonExample, null, 2)).then(() => {
          const status = root.querySelector('#lt-copy-status');
          if (status) status.textContent = 'Sample JSON copied.';
        }).catch(() => {
          const target = root.querySelector('#lt-json');
          if (target) { target.value = JSON.stringify(jsonExample, null, 2); target.focus(); target.select(); }
        });
        break;
      case 'import-json':
        try {
          const imported = parseImport(root.querySelector('#lt-json').value);
          state.listeningLessons.unshift(imported); persist();
          ui.lessonId = imported.id; ui.selected = new Set(); ui.session = null; ui.view = 'detail'; render();
        } catch (err) { root.querySelector('#lt-import-error').textContent = err.message; }
        break;
      case 'new': editLesson(null); break;
      case 'edit':
        stopAudio();
        if (btn.dataset.id) ui.lessonId = btn.dataset.id;
        editLesson(lesson());
        break;
      case 'cancel-edit': ui.view = ui.draft ? 'detail' : 'list'; render(); break;
      case 'add-row': root.querySelector('#lt-rows').insertAdjacentHTML('beforeend', sentenceRow()); break;
      case 'remove-row': btn.closest('.lt-editor-row').remove(); break;
      case 'open': ui.lessonId = btn.dataset.id; ui.selected = new Set(); ui.session = null; ui.view = 'detail'; render(); break;
      case 'list': stopAudio(); ui.view = 'list'; render(); break;
      case 'detail': stopAudio(); ui.view = 'detail'; render(); break;
      case 'delete':
        if (window.confirm('Delete this lesson?')) { state.listeningLessons = state.listeningLessons.filter(l => l.id !== btn.dataset.id); persist(); render(); }
        break;
      case 'start': start(lesson().sentences.filter(s => ui.selected.has(s.id))); break;
      case 'restart': start(ui.session.entries.map(e => e.sentence)); break;
      case 'play': play(); break;
      case 'check': {
        const entry = ui.session.entries[ui.session.index]; entry.revealed = true;
        recordCheck(entry);
        root.querySelector('#lt-feedback').innerHTML = feedback(entry); break;
      }
      case 'next':
        stopAudio();
        saveBestScores([ui.session.entries[ui.session.index]]);
        if (ui.session.index < ui.session.entries.length - 1) { ui.session.index++; render(); root.querySelector('#lt-answer').focus(); play(); }
        else { ui.view = 'results'; render(); }
        break;
      case 'results': stopAudio(); saveBestScores(ui.session.entries); ui.view = 'results'; render(); break;
      case 'review': ui.session.index = Number(btn.dataset.index); ui.session.entries[ui.session.index].revealed = true; ui.view = 'practice'; render(); break;
    }
  });
  document.getElementById('nav-listening').addEventListener('click', e => {
    e.preventDefault(); stopReadAloud(); stopAudio();
    if (currentPiperAudio) currentPiperAudio.pause();
    state.section = 'listening'; renderAll();
  });
  window.Listening = { render, stopAudio, grade, parseImport, captureSelection, practiceWeight, weightedPracticeOrder };
  render();
})();
