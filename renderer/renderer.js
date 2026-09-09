'use strict';

// ============================================================================
// State — mirrors the Component class in "Quan Ly Bai Viet.dc.html"
// ============================================================================
const state = {
  search: '',
  posts: [
    { id: 1, title: 'this day, that year', excerpt: 'You have already left me, my dear. The promises have blown away with the wind, my dear.', rating: '5', votes: 2, words: 66, chars: 316, bookmarks: 0, finished: 81, age: '6d',
      body: 'You have already left me, my dear\nThe promises have blown away with the wind, my dear\nWe came together to teach each other to love someone with a whole heart\nBut that honesty was meant for the one who came after\nRain and storms are just the will of the sky, my dear\nTime will heal me too, in the end\nYou have already let go, leaving behind so many words' },
    { id: 2, title: 'Động lực cuộc sống', excerpt: 'Có động lực đủ mạnh, biết cách duy trì nó trong thời gian dài, và', rating: '4.86', votes: 5, words: 394, chars: 2001, bookmarks: 1, finished: 87, age: '14d',
      body: 'Có động lực đủ mạnh, biết cách duy trì nó trong thời gian dài, và\nkiên trì với mục tiêu đã đặt ra dù có khó khăn.' },
    { id: 3, title: 'Buổi sáng Hà Nội', excerpt: 'Sương mờ giăng trên mặt hồ, tiếng rao hàng vang lên từ đầu phố', rating: '4.7', votes: 8, words: 210, chars: 1120, bookmarks: 3, finished: 64, age: '20d',
      body: 'Sương mờ giăng trên mặt hồ, tiếng rao hàng vang lên từ đầu phố\nHà Nội thức dậy chậm rãi trong tiết trời se lạnh.' },
    { id: 4, title: 'Ký ức tuổi thơ', excerpt: 'Những buổi trưa hè trốn ngủ, chạy ra bờ ao bắt cá cùng lũ bạn', rating: '4.5', votes: 3, words: 158, chars: 812, bookmarks: 0, finished: 45, age: '1mo',
      body: 'Những buổi trưa hè trốn ngủ, chạy ra bờ ao bắt cá cùng lũ bạn\nNhững kỷ niệm ấy không bao giờ quên được.' },
  ],
  currentPostId: null,
  section: 'practice',
  typedText: '',
  timeLeft: 60,
  timerRunning: false,
  timerEnabled: true,
  autoReadEnabled: false,
  selectionText: '',
  showAddModal: false,
  editingPostId: null,
  textMode: 'raw',
  mdView: 'edit',
  title: '',
  text: '',
  language: 'English (english)',
};

const corpusEntries = [
  { term: 'my dear', definition: 'used affectionately to address someone', ipa: '', pos: 'phrase', stop: 'No' },
  { term: 'ubiquitous', definition: 'present, appearing, or found everywhere', ipa: '/juːˈbɪkwɪtəs/', pos: 'adjective', stop: 'No' },
  { term: 'look forward to', definition: 'to feel excited about something that is going to happen', ipa: '', pos: 'phrasal verb', stop: 'No' },
  { term: 'the', definition: 'used to refer to a specific thing already mentioned', ipa: '/ðə/', pos: 'determiner', stop: 'Yes' },
  { term: 'get away with', definition: '', ipa: '', pos: 'phrasal verb', stop: 'No' },
  { term: 'meticulous', definition: 'showing great attention to detail', ipa: '/mɪˈtɪkjələs/', pos: 'adjective', stop: 'No' },
  { term: 'a', definition: '', ipa: '/ə/', pos: 'article', stop: 'Yes' },
  { term: 'resilience', definition: 'the ability to recover quickly from difficulties', ipa: '', pos: 'noun', stop: 'No' },
  { term: 'on the other hand', definition: 'used to introduce a contrasting fact or viewpoint', ipa: '', pos: 'phrase', stop: 'No' },
];

let timerHandle = null;
let lastSpokenTerm = '';

// ============================================================================
// Local persistence — saved to a JSON file under Electron's userData dir
// (see main.js / preload.js) so data survives an app restart.
// ============================================================================
function persist() {
  window.api?.saveData({ posts: state.posts, corpusEntries });
}

async function loadPersisted() {
  const saved = await window.api?.loadData();
  if (!saved) { persist(); return; }
  if (Array.isArray(saved.posts)) state.posts = saved.posts;
  if (Array.isArray(saved.corpusEntries)) {
    corpusEntries.length = 0;
    corpusEntries.push(...saved.corpusEntries);
  }
}

// ============================================================================
// Logic — ported 1:1 from the DC component's methods
// ============================================================================
function addToCorpus(term) {
  if (!term || corpusEntries.some(e => e.term.toLowerCase() === term)) return;
  corpusEntries.push({ term, definition: '', ipa: '', pos: '', stop: 'No' });
  renderCorpus();
  persist();
}

function norm(t) {
  return t.toLowerCase().replace(/^[^a-zà-ỹ0-9]+|[^a-zà-ỹ0-9]+$/gi, '');
}

function lookupWordInfo(raw) {
  const key = norm(raw);
  const entry = corpusEntries.find(e => e.term.toLowerCase() === key);
  return {
    term: raw,
    meaningText: (entry && entry.definition) || (entry ? '—' : 'Not in corpus'),
    meaningCls: (entry && entry.definition) ? '' : 'col-empty',
    ipaText: (entry && entry.ipa) || '—',
    ipaCls: (entry && entry.ipa) ? '' : 'col-empty',
    canAdd: !entry && !!key,
    key,
  };
}

function tokenizeBody(body) {
  const letterPos = new Array(body.length).fill(-1);
  let inWord = false, letterCounter = 0;
  const words = [];
  for (let i = 0; i < body.length; i++) {
    const isSep = body[i] === ' ' || body[i] === '\n';
    if (!isSep) {
      if (!inWord) { words.push({ start: i, end: i }); inWord = true; }
      words[words.length - 1].end = i + 1;
      letterPos[i] = letterCounter;
      letterCounter += 1;
    } else inWord = false;
  }
  const wordTexts = words.map(w => norm(body.slice(w.start, w.end)));
  const phrases = corpusEntries
    .map(e => e.term.toLowerCase().split(/\s+/))
    .filter(arr => arr.length > 1)
    .sort((a, b) => b.length - a.length);

  const chunkIds = new Array(body.length).fill(-1);
  const chunks = [];
  let chunkCounter = -1, wi = 0;
  while (wi < words.length) {
    let matchLen = 1;
    for (const phrase of phrases) {
      if (wi + phrase.length <= words.length && phrase.every((p, k) => wordTexts[wi + k] === p)) { matchLen = phrase.length; break; }
    }
    chunkCounter += 1;
    const from = words[wi].start, to = words[wi + matchLen - 1].end;
    for (let k = from; k < to; k++) chunkIds[k] = chunkCounter;
    chunks.push({ id: chunkCounter, start: from, end: to });
    wi += matchLen;
  }
  return { letterPos, chunkIds, chunks, chunkCounter, letterCounter };
}

function activeChunkTextAt(body, typedLen) {
  const tok = tokenizeBody(body);
  let activeChunkId = tok.letterCounter > 0 ? (() => { for (let i = 0; i < body.length; i++) { if (tok.letterPos[i] === typedLen) return tok.chunkIds[i]; } return -1; })() : -1;
  if (activeChunkId === -1) activeChunkId = tok.chunkCounter;
  const chunk = tok.chunks.find(c => c.id === activeChunkId);
  return chunk ? body.slice(chunk.start, chunk.end) : '';
}

function speak(text) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

function startTimer() {
  if (timerHandle || !state.timerEnabled) return;
  state.timerRunning = true;
  timerHandle = setInterval(() => {
    state.timeLeft = Math.max(0, state.timeLeft - 1);
    if (state.timeLeft === 0) stopTimer();
    renderTimer();
  }, 1000);
}
function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  state.timerRunning = false;
}

function currentPost() {
  return state.posts.find(p => p.id === state.currentPostId) || null;
}

function openPost(id) {
  stopTimer();
  lastSpokenTerm = '';
  state.currentPostId = id;
  state.typedText = '';
  state.timeLeft = 60;
  state.selectionText = '';
  renderAll();
  const ta = document.getElementById('typing-input');
  if (ta) ta.focus();
}
function backToList() {
  stopTimer();
  state.currentPostId = null;
  renderAll();
}
function restartPractice() {
  stopTimer();
  lastSpokenTerm = '';
  state.typedText = '';
  state.timeLeft = 60;
  const ta = document.getElementById('typing-input');
  if (ta) ta.value = '';
  renderDetail();
  if (ta) ta.focus();
}

function toggleAutoRead() {
  state.autoReadEnabled = !state.autoReadEnabled;
  renderDetail();
}
function toggleTimerEnabled() {
  state.timerEnabled = !state.timerEnabled;
  if (!state.timerEnabled) stopTimer();
  renderDetail();
}

function onTypedChange(rawValue) {
  const post = currentPost();
  if (!post) return;
  const value = rawValue.replace(/[ \n]/g, '');
  const body = post.body;
  const lettersLen = body.replace(/[ \n]/g, '').length;
  if (value.length > lettersLen) {
    const ta = document.getElementById('typing-input');
    if (ta) ta.value = state.typedText;
    return;
  }
  if (value.length > 0 && !state.timerRunning && state.timeLeft > 0) startTimer();
  state.typedText = value;
  if (value.length >= lettersLen) stopTimer();
  if (state.autoReadEnabled) {
    const term = activeChunkTextAt(body, value.length);
    if (term && term !== lastSpokenTerm) { lastSpokenTerm = term; speak(term); }
  }
  const ta = document.getElementById('typing-input');
  if (ta) ta.value = state.typedText;
  renderDetail();
}

function onPracticeMouseUp(e) {
  const sel = (window.getSelection().toString() || '').trim();
  if (sel) {
    state.selectionText = sel;
    renderWordCard();
  } else {
    state.selectionText = '';
    renderWordCard();
    const ta = document.getElementById('typing-input');
    if (ta) ta.focus();
  }
}

function openAddModal() {
  state.showAddModal = true;
  state.editingPostId = null;
  state.textMode = 'raw';
  state.mdView = 'edit';
  state.title = '';
  state.text = '';
  state.language = 'English (english)';
  renderAddModal();
  clearAddModalErrors();
}
function openEditModal(post) {
  state.showAddModal = true;
  state.editingPostId = post.id;
  state.textMode = 'raw';
  state.mdView = 'edit';
  state.title = post.title;
  state.text = post.body;
  state.language = post.language || 'English (english)';
  renderAddModal();
  clearAddModalErrors();
}
function closeAddModal() {
  state.showAddModal = false;
  renderAddModal();
}

function clearAddModalErrors() {
  document.getElementById('add-title-error').hidden = true;
  document.getElementById('add-text-error').hidden = true;
}
function validateAddModal() {
  const titleOk = !!(state.title && state.title.trim());
  const textOk = !!(state.text && state.text.trim().length >= 10);
  document.getElementById('add-title-error').hidden = titleOk;
  document.getElementById('add-text-error').hidden = textOk;
  return titleOk && textOk;
}

function nextPostId() {
  return state.posts.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}
function makeExcerpt(text) {
  const plain = (state.textMode === 'markdown' ? stripMarkdown(text) : text).replace(/\s+/g, ' ').trim();
  return plain.length > 140 ? plain.slice(0, 140).trimEnd() + '…' : plain;
}

function submitAddModal() {
  if (!validateAddModal()) return;
  const editingId = state.editingPostId;
  const text = state.text || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  if (editingId) {
    const post = state.posts.find(p => p.id === editingId);
    if (post) {
      post.title = state.title.trim();
      post.body = text;
      post.excerpt = makeExcerpt(text);
      post.words = words;
      post.chars = chars;
      post.language = state.language;
    }
    renderPostsList();
    if (state.currentPostId === editingId) renderDetail();
  } else {
    state.posts.unshift({
      id: nextPostId(),
      title: state.title.trim(),
      excerpt: makeExcerpt(text),
      rating: '0',
      votes: 0,
      words,
      chars,
      bookmarks: 0,
      finished: 0,
      age: 'Just now',
      body: text,
      language: state.language,
    });
    renderPostsList();
  }
  persist();
  closeAddModal();
}
function deletePost(id) {
  if (!window.confirm('Delete this text practice?')) return;
  state.posts = state.posts.filter(p => p.id !== id);
  if (state.currentPostId === id) state.currentPostId = null;
  renderAll();
  persist();
}

function stripMarkdown(src) {
  if (!src) return src;
  return src.split('\n').map(line => line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  ).join('\n');
}
function setTextMode(mode) {
  if (mode === 'raw' && state.textMode === 'markdown') {
    state.text = stripMarkdown(state.text);
    state.textMode = mode;
  } else {
    state.textMode = mode;
  }
  renderAddModal();
}
function setMdView(view) {
  state.mdView = view;
  renderAddModal();
}

function renderMarkdown(src) {
  if (!src || !src.trim()) return '<p style="opacity:0.6">Nothing to preview yet.</p>';
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = src.split('\n');
  let html = '', inList = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) { if (inList) { html += '</ul>'; inList = false; } html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (line.trim() === '') continue;
    html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

// ============================================================================
// Rendering
// ============================================================================
function goToPractice() { state.section = 'practice'; renderAll(); }
function goToCorpus() { state.section = 'corpus'; renderAll(); }

function renderNav() {
  document.getElementById('nav-practice').classList.toggle('active', state.section === 'practice');
  document.getElementById('nav-corpus').classList.toggle('active', state.section === 'corpus');
  document.getElementById('section-practice').hidden = state.section !== 'practice';
  document.getElementById('section-corpus').hidden = state.section !== 'corpus';
}

function renderPostsList() {
  const tbody = document.getElementById('posts-tbody');
  tbody.innerHTML = '';
  for (const post of state.posts) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="row-title"><a href="#">${escapeHtml(post.title)}</a></div>
        <div class="row-sub">${escapeHtml(post.excerpt)}</div>
      </td>
      <td class="col-num"><b>${escapeHtml(post.rating)}</b> <span style="opacity:0.6">(${post.votes} votes)</span></td>
      <td class="col-num">
        <div><b>${post.words} words</b></div>
        <div style="opacity:0.6; font-size: 13px;">${post.chars} characters</div>
      </td>
      <td class="col-icon">${post.bookmarks}</td>
      <td class="col-num">${post.finished}</td>
      <td class="col-num">${post.age}</td>
      <td class="col-icon">
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    `;
    tr.querySelector('.row-title a').addEventListener('click', (e) => { e.preventDefault(); openPost(post.id); });
    const [editBtn, deleteBtn] = tr.querySelectorAll('.col-icon .btn-icon');
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(post); });
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletePost(post.id); });
    tbody.appendChild(tr);
  }
}

function renderCorpus() {
  const tbody = document.getElementById('corpus-tbody');
  tbody.innerHTML = '';
  const emptyText = '—';
  corpusEntries.forEach((e, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-num">${i + 1}</td>
      <td><b>${escapeHtml(e.term)}</b></td>
      <td class="${e.definition ? '' : 'col-empty'}">${escapeHtml(e.definition || emptyText)}</td>
      <td class="${e.ipa ? '' : 'col-empty'}">${escapeHtml(e.ipa || emptyText)}</td>
      <td class="${e.pos ? '' : 'col-empty'}">${escapeHtml(e.pos || emptyText)}</td>
      <td class="${e.stop ? '' : 'col-empty'}">${escapeHtml(e.stop || emptyText)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Computes the tokenized view of the current post + the active chunk id,
// shared by renderPracticeText and renderWordCard so both stay in sync.
function computePracticeView() {
  const post = currentPost();
  if (!post) return null;
  const body = post.body;
  const tok = tokenizeBody(body);
  const { letterPos, chunkIds, chunks, chunkCounter } = tok;
  const typed = state.typedText || '';

  let activeChunkId = tok.letterCounter > 0
    ? (() => { for (let i = 0; i < body.length; i++) { if (letterPos[i] === typed.length) return chunkIds[i]; } return -1; })()
    : -1;
  if (activeChunkId === -1) activeChunkId = chunkCounter;

  return { post, body, tok, activeChunkId, typed };
}

function renderDetail() {
  const post = currentPost();
  document.getElementById('view-list').hidden = !!post;
  document.getElementById('view-detail').hidden = !post;
  if (!post) return;

  document.getElementById('detail-title').textContent = post.title;
  document.getElementById('detail-sub').textContent = `${post.words} words, ${post.chars} characters`;

  const btnAutoRead = document.getElementById('btn-auto-read');
  btnAutoRead.classList.toggle('is-on', state.autoReadEnabled);
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  btnTimerToggle.classList.toggle('is-on', state.timerEnabled);

  renderTimer();
  renderPracticeText();
  renderWordCard();
}

function renderTimer() {
  const timeLeft = state.timeLeft ?? 60;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const el = document.getElementById('timer-label');
  if (el) el.textContent = `${mm}:${ss}`;
}

function renderPracticeText() {
  const view = computePracticeView();
  const container = document.getElementById('practice-lines');
  container.innerHTML = '';
  if (!view) return;
  const { body, tok, activeChunkId, typed } = view;
  const { letterPos, chunkIds } = tok;

  let idx = 0;
  for (const lineText of body.split('\n')) {
    const lineDiv = document.createElement('div');
    for (const ch of lineText) {
      const lp = letterPos[idx];
      let cls = '';
      if (lp !== -1 && lp < typed.length) cls = typed[lp] === ch ? 'correct' : 'incorrect';
      if (chunkIds[idx] !== -1 && chunkIds[idx] === activeChunkId) cls += ' active-word';
      idx += 1;
      const span = document.createElement('span');
      span.className = ('ch ' + cls.trim()).trim();
      span.textContent = ch === ' ' ? ' ' : ch;
      lineDiv.appendChild(span);
    }
    idx += 1; // account for the newline position
    container.appendChild(lineDiv);
  }
}

function renderWordCard() {
  const view = computePracticeView();
  const kicker = document.getElementById('word-kicker');
  const termEl = document.getElementById('word-term');
  const meaningEl = document.getElementById('word-meaning');
  const ipaEl = document.getElementById('word-ipa');
  const btnAdd = document.getElementById('btn-add-to-corpus');
  const tagInCorpus = document.getElementById('tag-in-corpus');

  let activeWord = { term: '', meaningText: '—', meaningCls: 'col-empty', ipaText: '—', ipaCls: 'col-empty', canAdd: false, key: '' };
  if (view) {
    const { body, tok, activeChunkId } = view;
    const activeChunk = tok.chunks.find(c => c.id === activeChunkId);
    if (activeChunk) activeWord = lookupWordInfo(body.slice(activeChunk.start, activeChunk.end));
    if (state.selectionText) activeWord = lookupWordInfo(state.selectionText);
  }

  kicker.textContent = state.selectionText ? 'Selected text' : 'Current word';
  termEl.textContent = activeWord.term;
  meaningEl.textContent = activeWord.meaningText;
  meaningEl.className = 'val ' + activeWord.meaningCls;
  ipaEl.textContent = activeWord.ipaText;
  ipaEl.className = 'val ' + activeWord.ipaCls;
  btnAdd.hidden = !activeWord.canAdd;
  tagInCorpus.hidden = activeWord.canAdd;

  btnAdd.onclick = () => { addToCorpus(activeWord.key); renderWordCard(); };
}

function renderAddModal() {
  document.getElementById('add-modal-backdrop').hidden = !state.showAddModal;
  if (!state.showAddModal) return;

  document.getElementById('add-dialog-title').textContent = state.editingPostId ? 'Edit Text Practice' : 'New Text Practice';
  document.getElementById('add-publish-label').textContent = state.editingPostId ? 'Save Changes' : 'Publish';

  document.getElementById('add-title').value = state.title;
  document.getElementById('add-language').value = state.language;

  const isMarkdownMode = state.textMode === 'markdown';
  const isPreviewView = isMarkdownMode && state.mdView === 'preview';

  document.querySelector('input[name="textMode"][value="raw"]').checked = !isMarkdownMode;
  document.querySelector('input[name="textMode"][value="markdown"]').checked = isMarkdownMode;
  document.getElementById('md-view-row').hidden = !isMarkdownMode;
  document.querySelector('input[name="mdView"][value="edit"]').checked = state.mdView === 'edit';
  document.querySelector('input[name="mdView"][value="preview"]').checked = state.mdView === 'preview';

  const textarea = document.getElementById('add-text');
  const preview = document.getElementById('add-md-preview');
  textarea.value = state.text;
  textarea.hidden = isPreviewView;
  preview.hidden = !isPreviewView;
  if (isPreviewView) preview.innerHTML = renderMarkdown(state.text);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAll() {
  renderNav();
  renderPostsList();
  renderDetail();
  renderCorpus();
}

// ============================================================================
// Wiring
// ============================================================================
document.getElementById('nav-practice').addEventListener('click', goToPractice);
document.getElementById('nav-corpus').addEventListener('click', goToCorpus);

document.getElementById('search-input').addEventListener('input', (e) => { state.search = e.target.value; });

document.getElementById('btn-open-add').addEventListener('click', openAddModal);
document.getElementById('btn-back').addEventListener('click', backToList);
document.getElementById('btn-restart').addEventListener('click', restartPractice);
document.getElementById('btn-auto-read').addEventListener('click', toggleAutoRead);
document.getElementById('btn-timer-toggle').addEventListener('click', toggleTimerEnabled);

document.getElementById('practice-text').addEventListener('mouseup', onPracticeMouseUp);
document.getElementById('typing-input').addEventListener('input', (e) => onTypedChange(e.target.value));

document.getElementById('add-modal-backdrop').addEventListener('click', closeAddModal);
document.getElementById('add-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-add-cancel').addEventListener('click', closeAddModal);
document.getElementById('btn-add-publish').addEventListener('click', submitAddModal);
document.getElementById('add-title').addEventListener('input', (e) => { state.title = e.target.value; if (!document.getElementById('add-title-error').hidden) validateAddModal(); });
document.getElementById('add-text').addEventListener('input', (e) => { state.text = e.target.value; if (!document.getElementById('add-text-error').hidden) validateAddModal(); });
document.getElementById('add-language').addEventListener('change', (e) => { state.language = e.target.value; });
document.querySelectorAll('input[name="textMode"]').forEach(r => r.addEventListener('change', (e) => { if (e.target.checked) setTextMode(e.target.value); }));
document.querySelectorAll('input[name="mdView"]').forEach(r => r.addEventListener('change', (e) => { if (e.target.checked) setMdView(e.target.value); }));

loadPersisted().then(renderAll);
