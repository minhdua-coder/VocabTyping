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

  // Reading Practice
  readings: [],
  currentReadingId: null,
  showReadingModal: false,
  editingReadingId: null,
  readingTitle: '',
  readingText: '',
  readingType: 'markdown',
  readingPdfData: null,
  readingSource: 'created',
  readingFilename: '',
  readingMdView: 'edit',
  readingTopics: [],
  readingTopicId: '',
  readingTopicFilter: '',
  readingSearchOpen: false,
  readingSearchQuery: '',
  readingSearchMatches: [],
  readingSearchIndex: -1,
  pendingSelection: null,
  translateState: null,
  lookupState: null,
  pendingWord: null,
  editingHighlightId: null,
  autoHighlightOnAdd: false,
  defaultHighlightColor: '#fff3a3',

  // Vocabulary Collections
  vocabCollections: [],
  listeningLessons: [],
  lastUsedCollectionId: null,
  currentCollectionId: null,

  // LLM config (used by Translate)
  llmConfig: { baseUrl: '', apiKey: '', model: '' },
  speechRate: 1,

  // Piper TTS (offline neural voice, used by speak() when enabled)
  piperConfig: { enabled: false, piperPath: '', modelPath: '' },

  // Lookup (local Anh-Việt dictionary) and Translate provider — two separate
  // actions in the selection bubble menu, not an either/or choice.
  dictionaryConfig: { path: '' },
  customDictionaryConfig: { path: '' },
  translateProvider: 'google', // 'google' | 'llm'

  // Pronunciation scoring (offline phoneme recognition, see main.js)
  pronunciationConfig: { customModelDir: '' },
  pronunciationState: null,
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
  return window.api?.saveData({
    posts: state.posts,
    corpusEntries,
    readings: state.readings,
    readingTopics: state.readingTopics,
    vocabCollections: state.vocabCollections,
    listeningLessons: state.listeningLessons,
    lastUsedCollectionId: state.lastUsedCollectionId,
    llmConfig: state.llmConfig,
    speechRate: state.speechRate,
    autoHighlightOnAdd: state.autoHighlightOnAdd,
    defaultHighlightColor: state.defaultHighlightColor,
    piperConfig: state.piperConfig,
    translateProvider: state.translateProvider,
    dictionaryConfig: state.dictionaryConfig,
    customDictionaryConfig: state.customDictionaryConfig,
    pronunciationConfig: state.pronunciationConfig,
  });
}

async function loadPersisted() {
  const saved = await window.api?.loadData();
  if (!saved) { persist(); return; }
  if (Array.isArray(saved.posts)) state.posts = saved.posts;
  if (Array.isArray(saved.corpusEntries)) {
    corpusEntries.length = 0;
    corpusEntries.push(...saved.corpusEntries);
  }
  if (Array.isArray(saved.readings)) state.readings = saved.readings.map(r => ({ ...r, type: r.type || 'markdown' }));
  if (Array.isArray(saved.readingTopics)) state.readingTopics = saved.readingTopics;
  if (Array.isArray(saved.vocabCollections)) state.vocabCollections = saved.vocabCollections;
  if (Array.isArray(saved.listeningLessons)) state.listeningLessons = saved.listeningLessons;
  if (typeof saved.lastUsedCollectionId === 'string') state.lastUsedCollectionId = saved.lastUsedCollectionId;
  if (saved.llmConfig && typeof saved.llmConfig === 'object') {
    state.llmConfig = { baseUrl: '', apiKey: '', model: '', ...saved.llmConfig };
  }
  if (typeof saved.speechRate === 'number' && saved.speechRate > 0) state.speechRate = saved.speechRate;
  if (typeof saved.autoHighlightOnAdd === 'boolean') state.autoHighlightOnAdd = saved.autoHighlightOnAdd;
  if (typeof saved.defaultHighlightColor === 'string' && saved.defaultHighlightColor) state.defaultHighlightColor = saved.defaultHighlightColor;
  if (saved.piperConfig && typeof saved.piperConfig === 'object') {
    state.piperConfig = { enabled: false, piperPath: '', modelPath: '', ...saved.piperConfig };
  }
  if (typeof saved.translateProvider === 'string') state.translateProvider = saved.translateProvider;
  if (saved.dictionaryConfig && typeof saved.dictionaryConfig === 'object') {
    state.dictionaryConfig = { path: '', ...saved.dictionaryConfig };
  }
  if (saved.customDictionaryConfig && typeof saved.customDictionaryConfig === 'object') {
    state.customDictionaryConfig = { path: '', ...saved.customDictionaryConfig };
  }
  if (saved.pronunciationConfig && typeof saved.pronunciationConfig === 'object') {
    state.pronunciationConfig = { customModelDir: '', ...saved.pronunciationConfig };
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
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

let currentPiperAudio = null;
function isPiperConfigured() {
  const p = state.piperConfig;
  return !!(p && p.enabled && p.piperPath && p.modelPath);
}
async function speakWithPiper(text, rate) {
  try {
    const result = await window.api.piperSpeak({
      piperPath: state.piperConfig.piperPath,
      modelPath: state.piperConfig.modelPath,
      text,
      rate: rate || 1,
    });
    if (!result || result.error || !result.audioBase64) {
      console.warn('Piper TTS failed, falling back to system voice:', result && result.error);
      return false;
    }
    const bytes = Uint8Array.from(atob(result.audioBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    if (currentPiperAudio) {
      currentPiperAudio.pause();
      URL.revokeObjectURL(currentPiperAudio.src);
    }
    currentPiperAudio = new Audio(url);
    currentPiperAudio.addEventListener('ended', () => URL.revokeObjectURL(url));
    await currentPiperAudio.play();
    return true;
  } catch (err) {
    console.warn('Piper TTS error:', err);
    return false;
  }
}
async function speak(text, rate) {
  if (!text) return;
  if (isPiperConfigured()) {
    const ok = await speakWithPiper(text, rate);
    if (ok) return;
  }
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate || 1;
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
    if (term && term !== lastSpokenTerm) { lastSpokenTerm = term; speak(term, state.speechRate); }
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

// Single-pass inline scanner (code/bold/italic/links). Finds the literal
// closing marker via indexOf instead of chaining regexes, so formatting
// right next to punctuation or another marker (e.g. "**text**.", "**a**,**b**")
// resolves unambiguously instead of depending on regex match order.
function renderInlineMarkdown(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < n && /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\]/.test(text[i + 1])) {
      out += escapeHtml(text[i + 1]);
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        out += `<code>${escapeHtml(text.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    } else if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1 && end > i + 2) {
        out += `<strong>${renderInlineMarkdown(text.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    } else if (ch === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        out += `<em>${renderInlineMarkdown(text.slice(i + 1, end))}</em>`;
        i = end + 1;
        continue;
      }
    } else if (ch === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          out += `<a href="${escapeHtml(url)}">${renderInlineMarkdown(linkText)}</a>`;
          i = closeParen + 1;
          continue;
        }
      }
    }
    out += escapeHtml(ch);
    i++;
  }
  return out;
}

function parseTableRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map(c => c.trim());
}
function isTableSeparatorRow(line) {
  if (!line || !line.includes('|') && !line.includes('-')) return false;
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every(c => /^:?-{1,}:?$/.test(c));
}
function tableCellAlign(sepCell) {
  const left = sepCell.startsWith(':'), right = sepCell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

// Pandoc "simple table" — columns aligned by whitespace, no pipes, e.g.:
//   Name   Role       Score
//   ------ ---------- -----
//   Alice  Engineer   95
function isSimpleTableSeparator(line) {
  return /^[ \t]*-{2,}(?:[ \t]+-{2,})+[ \t]*$/.test(line || '');
}
function isHorizontalRule(line) {
  return /^[ \t]*-{3,}[ \t]*$/.test(line || '');
}
function computeColumnRanges(sepLine) {
  const ranges = [];
  const re = /-{2,}/g;
  let m;
  while ((m = re.exec(sepLine))) ranges.push([m.index, m.index + m[0].length]);
  if (ranges.length) ranges[ranges.length - 1][1] = Infinity;
  return ranges;
}
function sliceColumns(line, ranges) {
  return ranges.map(([start, end]) => line.slice(start, end === Infinity ? line.length : end).trim());
}

// True when `line` starts a new block construct (so a paragraph/list-item/
// blockquote being accumulated across hard-wrapped source lines must stop
// before consuming it). `nextLine` is needed to detect table headers, whose
// "block-ness" only becomes apparent from the separator row below them.
function isBlockBoundary(line, nextLine) {
  if (line === undefined || line.trim() === '') return true;
  if (isHorizontalRule(line)) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^[-*]\s+/.test(line)) return true;
  if (/^>\s?/.test(line)) return true;
  if (isSimpleTableSeparator(line) || isSimpleTableSeparator(nextLine)) return true;
  if (line.includes('|') && isTableSeparatorRow(nextLine)) return true;
  return false;
}
// Collects consecutive lines that belong to the same soft-wrapped block
// (paragraph/list-item/blockquote), starting at lines[i], stopping at a
// blank line or the start of a new block. Joined with a space, matching how
// markdown treats a single line break inside a block as normal whitespace.
function collectWrappedLines(lines, i) {
  const parts = [lines[i].trim()];
  let j = i + 1;
  while (j < lines.length && !isBlockBoundary(lines[j], lines[j + 1])) {
    parts.push(lines[j].trim());
    j++;
  }
  return { text: parts.join(' '), next: j };
}

function renderMarkdown(src) {
  if (!src || !src.trim()) return '<p style="opacity:0.6">Nothing to preview yet.</p>';
  const inline = renderInlineMarkdown;
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let html = '', inList = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isHorizontalRule(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr>';
      i++;
      continue;
    }

    if (isSimpleTableSeparator(lines[i + 1]) && line.trim() !== '') {
      const ranges = computeColumnRanges(lines[i + 1]);
      if (ranges.length >= 2) {
        if (inList) { html += '</ul>'; inList = false; }
        const headerCells = sliceColumns(line, ranges);
        let table = '<div class="table-scroll"><table class="md-table"><thead><tr>';
        headerCells.forEach(c => { table += `<th>${inline(c)}</th>`; });
        table += '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && lines[i].trim() !== '' && !isSimpleTableSeparator(lines[i])) {
          const cells = sliceColumns(lines[i], ranges);
          table += '<tr>';
          cells.forEach(c => { table += `<td>${inline(c)}</td>`; });
          table += '</tr>';
          i++;
        }
        if (i < lines.length && isSimpleTableSeparator(lines[i])) i++; // optional closing separator
        table += '</tbody></table></div>';
        html += table;
        continue;
      }
    }

    if (line.includes('|') && isTableSeparatorRow(lines[i + 1])) {
      if (inList) { html += '</ul>'; inList = false; }
      const headerCells = parseTableRow(line);
      const aligns = parseTableRow(lines[i + 1]).map(tableCellAlign);
      let table = '<div class="table-scroll"><table class="md-table"><thead><tr>';
      headerCells.forEach((c, idx) => {
        const style = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : '';
        table += `<th${style}>${inline(c)}</th>`;
      });
      table += '</tr></thead><tbody>';
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = parseTableRow(lines[i]);
        table += '<tr>';
        cells.forEach((c, idx) => {
          const style = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : '';
          table += `<td${style}>${inline(c)}</td>`;
        });
        table += '</tr>';
        i++;
      }
      table += '</tbody></table></div>';
      html += table;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      i++;
      continue;
    }

    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) { html += '<ul>'; inList = true; }
      const parts = [li[1]];
      let j = i + 1;
      while (j < lines.length && !isBlockBoundary(lines[j], lines[j + 1])) { parts.push(lines[j].trim()); j++; }
      html += `<li>${inline(parts.join(' '))}</li>`;
      i = j;
      continue;
    }

    if (/^>\s?/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      const parts = [line.replace(/^>\s?/, '')];
      let j = i + 1;
      while (j < lines.length && /^>\s?/.test(lines[j])) { parts.push(lines[j].replace(/^>\s?/, '')); j++; }
      html += `<blockquote><p>${inline(parts.join(' '))}</p></blockquote>`;
      i = j;
      continue;
    }

    if (inList) { html += '</ul>'; inList = false; }
    if (line.trim() === '') { i++; continue; }

    const { text, next } = collectWrappedLines(lines, i);
    html += `<p>${inline(text)}</p>`;
    i = next;
  }
  if (inList) html += '</ul>';
  return html;
}

// ============================================================================
// Rendering
// ============================================================================
function goToPractice() { stopReadAloud(); state.section = 'practice'; renderAll(); }
function goToCorpus() { stopReadAloud(); state.section = 'corpus'; renderAll(); }

function renderNav() {
  hideSelectionMenu();
  document.getElementById('nav-listening').classList.toggle('active', state.section === 'listening');
  document.getElementById('section-listening').hidden = state.section !== 'listening';
  if (state.section !== 'listening') window.Listening?.stopAudio();
  else window.Listening?.render();
  document.getElementById('nav-practice').classList.toggle('active', state.section === 'practice');
  document.getElementById('nav-corpus').classList.toggle('active', state.section === 'corpus');
  document.getElementById('nav-reading').classList.toggle('active', state.section === 'reading');
  document.getElementById('nav-collections').classList.toggle('active', state.section === 'collections');
  document.getElementById('section-practice').hidden = state.section !== 'practice';
  document.getElementById('section-corpus').hidden = state.section !== 'corpus';
  document.getElementById('section-reading').hidden = state.section !== 'reading';
  document.getElementById('section-collections').hidden = state.section !== 'collections';
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

// ============================================================================
// Reading Practice — upload/create markdown readings, highlight + translate
// ============================================================================
function currentReading() {
  return state.readings.find(r => r.id === state.currentReadingId) || null;
}
function nextReadingId() {
  return state.readings.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function goToReading() { state.section = 'reading'; renderAll(); }
function goToCollections() { stopReadAloud(); state.section = 'collections'; renderAll(); }

function resetReadingSearchUI() {
  state.readingSearchOpen = false;
  state.readingSearchQuery = '';
  state.readingSearchMatches = [];
  state.readingSearchIndex = -1;
  const bar = document.getElementById('reading-search-bar');
  if (bar) bar.hidden = true;
  const input = document.getElementById('reading-search-input');
  if (input) input.value = '';
}
function openReading(id) {
  stopReadAloud();
  state.currentReadingId = id;
  resetReadingSearchUI();
  renderReadingList();
  renderReadingDetail();
}
function backToReadingList() {
  stopReadAloud();
  state.currentReadingId = null;
  hideSelectionMenu();
  resetReadingSearchUI();
  renderReadingList();
  renderReadingDetail();
}
function deleteReading(id) {
  if (!window.confirm('Delete this reading?')) return;
  state.readings = state.readings.filter(r => r.id !== id);
  if (state.currentReadingId === id) state.currentReadingId = null;
  renderReadingList();
  renderReadingDetail();
  persist();
}

function openReadingAddModal() {
  state.showReadingModal = true;
  state.editingReadingId = null;
  state.readingTitle = '';
  state.readingText = '';
  state.readingType = 'markdown';
  state.readingPdfData = null;
  state.readingSource = 'created';
  state.readingFilename = '';
  state.readingMdView = 'edit';
  state.readingTopicId = state.readingTopicFilter || '';
  renderReadingModal();
}
function openReadingEditModal(reading) {
  state.showReadingModal = true;
  state.editingReadingId = reading.id;
  state.readingTitle = reading.title;
  state.readingType = reading.type || 'markdown';
  state.readingPdfData = reading.pdfData || null;
  state.readingText = reading.body;
  state.readingSource = reading.source || 'created';
  state.readingFilename = reading.filename || '';
  state.readingMdView = 'edit';
  state.readingTopicId = reading.topicId || '';
  renderReadingModal();
}
function closeReadingModal() {
  state.showReadingModal = false;
  document.getElementById('reading-modal-backdrop').hidden = true;
}
function clearReadingModalErrors() {
  document.getElementById('reading-title-error').hidden = true;
  document.getElementById('reading-text-error').hidden = true;
  document.getElementById('reading-new-topic-error').hidden = true;
}
function validateReadingModal() {
  const titleOk = !!(state.readingTitle && state.readingTitle.trim());
  const textOk = state.readingType === 'pdf' ? !!state.readingPdfData : !!(state.readingText && state.readingText.trim().length >= 10);
  document.getElementById('reading-title-error').hidden = titleOk;
  document.getElementById('reading-text-error').hidden = textOk;
  return titleOk && textOk;
}
function setReadingMdView(view) {
  state.readingMdView = view;
  renderReadingModal();
}
function populateReadingTopicSelect() {
  const select = document.getElementById('reading-topic-select');
  select.innerHTML = '<option value="">— No topic —</option>';
  for (const t of state.readingTopics) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  }
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ New topic';
  select.appendChild(newOpt);
  select.value = state.readingTopicId || '';
  document.getElementById('reading-new-topic-field').hidden = select.value !== '__new__';
}
function resolveReadingTopicId() {
  const select = document.getElementById('reading-topic-select');
  if (select.value !== '__new__') return { id: select.value || null };
  const name = document.getElementById('reading-new-topic-name').value.trim();
  if (!name) return { error: true };
  let topic = state.readingTopics.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (!topic) {
    topic = { id: uid('topic'), name, createdAt: Date.now() };
    state.readingTopics.push(topic);
  }
  return { id: topic.id };
}
function renderReadingModal() {
  document.getElementById('reading-modal-backdrop').hidden = !state.showReadingModal;
  if (!state.showReadingModal) return;

  document.getElementById('reading-dialog-title').textContent = state.editingReadingId ? 'Edit Reading' : 'New Reading';
  document.getElementById('reading-save-label').textContent = state.editingReadingId ? 'Save Changes' : 'Save';
  document.getElementById('reading-title-input').value = state.readingTitle;
  populateReadingTopicSelect();

  document.getElementById('reading-text-input').closest('.field').hidden = state.readingType === 'pdf';
  const pdfInfo = document.getElementById('reading-pdf-info');
  pdfInfo.hidden = state.readingType !== 'pdf';
  pdfInfo.textContent = state.readingType === 'pdf' ? `PDF: ${state.readingFilename}. Save to preview the document and select text.` : '';
  const isPreview = state.readingMdView === 'preview';
  document.querySelector('input[name="readingMdView"][value="edit"]').checked = !isPreview;
  document.querySelector('input[name="readingMdView"][value="preview"]').checked = isPreview;

  const textarea = document.getElementById('reading-text-input');
  const preview = document.getElementById('reading-md-preview');
  textarea.value = state.readingText;
  textarea.hidden = isPreview;
  preview.hidden = !isPreview;
  if (isPreview) preview.innerHTML = renderMarkdown(state.readingText);
}
function submitReadingModal() {
  if (!validateReadingModal()) return;
  const topicResult = resolveReadingTopicId();
  if (topicResult.error) { document.getElementById('reading-new-topic-error').hidden = false; return; }

  const editingId = state.editingReadingId;
  const title = state.readingTitle.trim();
  const body = state.readingText;

  if (editingId) {
    const reading = state.readings.find(r => r.id === editingId);
    if (reading) { reading.title = title; reading.body = body; reading.topicId = topicResult.id; }
  } else {
    state.readings.unshift({
      id: nextReadingId(),
      title,
      body,
      type: state.readingType,
      ...(state.readingType === 'pdf' ? { pdfData: state.readingPdfData } : {}),
      source: state.readingSource || 'created',
      filename: state.readingFilename || '',
      language: 'English (english)',
      topicId: topicResult.id,
      createdAt: Date.now(),
      highlights: [],
    });
  }
  persist();
  closeReadingModal();
  renderReadingList();
  if (state.currentReadingId === editingId) renderReadingDetail();
}

async function handleUploadReading() {
  if (!window.api?.openMarkdownFile) return;
  let result;
  try { result = await window.api.openMarkdownFile(); }
  catch (err) { window.alert('Unable to open document: ' + err.message); return; }
  if (!result) return;
  state.showReadingModal = true;
  state.editingReadingId = null;
  state.readingTitle = result.filename.replace(/\.(md|markdown|pdf)$/i, '');
  state.readingType = result.type || 'markdown';
  state.readingPdfData = result.pdfData || null;
  state.readingText = result.content;
  state.readingSource = 'upload';
  state.readingFilename = result.filename;
  state.readingMdView = 'edit';
  state.readingTopicId = state.readingTopicFilter || '';
  renderReadingModal();
}

// ---- DOM text-offset helpers (used by highlight + translate selection) ----
function getTextNodesIn(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}
function offsetInContainer(container, node, nodeOffset) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, nodeOffset);
  return range.toString().length;
}
function rangeToOffsets(container, range) {
  const a = offsetInContainer(container, range.startContainer, range.startOffset);
  const b = offsetInContainer(container, range.endContainer, range.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

// Wraps saved [start,end) ranges (character offsets into the container's
// flattened text) in <mark> elements, splitting text nodes as needed so a
// highlight can span across inline tags (e.g. bold text).
function applyHighlightsToContainer(container, highlights, className) {
  if (!highlights || !highlights.length) return;
  const cls = className || 'hl';
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  for (const h of sorted) {
    if (h.end <= h.start) continue;
    const textNodes = getTextNodesIn(container);
    let offset = 0;
    for (const node of textNodes) {
      const nodeLen = node.textContent.length;
      const nodeStart = offset;
      const nodeEnd = offset + nodeLen;
      offset = nodeEnd;
      if (h.end <= nodeStart || h.start >= nodeEnd) continue;
      const localStart = Math.max(0, h.start - nodeStart);
      const localEnd = Math.min(nodeLen, h.end - nodeStart);
      if (localStart >= localEnd) continue;

      let workNode = node;
      if (localEnd < nodeLen) workNode.splitText(localEnd);
      let markNode = workNode;
      if (localStart > 0) markNode = workNode.splitText(localStart);

      const mark = document.createElement('mark');
      mark.className = cls;
      mark.dataset.hlId = h.id;
      if (h.color) mark.style.background = h.color;
      mark.title = (cls === 'hl' && h.id !== 'jump-temp') ? 'Click to remove highlight' : '';
      markNode.parentNode.insertBefore(mark, markNode);
      mark.appendChild(markNode);
    }
  }
}

function hideSelectionMenu() {
  const menu = document.getElementById('selection-menu');
  if (menu) menu.hidden = true;
  state.pendingSelection = null;
  state.editingHighlightId = null;
}
function showSelectionMenuAt(rectSource) {
  const menu = document.getElementById('selection-menu');
  menu.hidden = false;
  const rect = rectSource.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - menuRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
  let top = rect.top - menuRect.height - 8;
  if (top < 8) top = rect.bottom + 8;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
function onReadingPreviewMouseUp() {
  const preview = document.getElementById('reading-preview');
  if (preview.getAttribute('aria-busy') === 'true') return;
  const sel = window.getSelection();
  const text = (sel.toString() || '').trim();
  if (!text || sel.rangeCount === 0) { hideSelectionMenu(); return; }
  const range = sel.getRangeAt(0);
  if (!preview.contains(range.commonAncestorContainer)) { hideSelectionMenu(); return; }
  const offsets = rangeToOffsets(preview, range);
  if (!offsets || offsets.end <= offsets.start) { hideSelectionMenu(); return; }
  state.pendingSelection = { start: offsets.start, end: offsets.end, text, source: { readingId: currentReading()?.id, start: offsets.start, end: offsets.end } };
  document.querySelectorAll('#selection-menu .sel-swatch, #selection-menu .sel-menu-divider').forEach(el => { el.hidden = false; });
  state.editingHighlightId = null;
  document.getElementById('btn-sel-lookup').hidden = false;
  document.getElementById('btn-sel-translate').hidden = false;
  document.getElementById('btn-sel-pronounce').hidden = false;
  document.getElementById('btn-sel-remove').hidden = true;
  showSelectionMenuAt(range);
}
function addHighlight(color) {
  const reading = currentReading();
  const sel = state.pendingSelection;
  if (!reading || !sel) return;
  reading.highlights = reading.highlights || [];
  reading.highlights.push({ id: uid('hl'), start: sel.start, end: sel.end, text: sel.text, color, createdAt: Date.now() });
  persist();
  window.getSelection().removeAllRanges();
  hideSelectionMenu();
  renderReadingDetail();
}
function recolorHighlight(hlId, color) {
  const reading = currentReading();
  if (!reading) return;
  const h = (reading.highlights || []).find(x => x.id === hlId);
  if (!h) return;
  h.color = color;
  persist();
  hideSelectionMenu();
  renderReadingDetail();
}
function removeHighlight(hlId) {
  const reading = currentReading();
  if (!reading) return;
  reading.highlights = (reading.highlights || []).filter(h => h.id !== hlId);
  persist();
  renderReadingDetail();
}
function getHighlightText(hlId) {
  const reading = currentReading();
  if (!reading) return '';
  const h = (reading.highlights || []).find(x => x.id === hlId);
  return h ? h.text : '';
}
function speakSelectionMenuTarget() {
  if (state.section === 'listening') window.Listening?.stopAudio();
  const text = state.pendingSelection
    ? state.pendingSelection.text
    : state.editingHighlightId
      ? getHighlightText(state.editingHighlightId)
      : '';
  if (text) speak(text, state.speechRate);
}
function openHighlightEditMenu(hlId, markEl) {
  document.querySelectorAll('#selection-menu .sel-swatch, #selection-menu .sel-menu-divider').forEach(el => { el.hidden = false; });
  state.pendingSelection = null;
  state.editingHighlightId = hlId;
  document.getElementById('btn-sel-lookup').hidden = true;
  document.getElementById('btn-sel-translate').hidden = true;
  document.getElementById('btn-sel-pronounce').hidden = true;
  document.getElementById('btn-sel-remove').hidden = false;
  showSelectionMenuAt(markEl);
}
function onReadingPreviewClick(e) {
  const sel = window.getSelection();
  if (sel && sel.toString().trim()) return; // this click is part of a drag-selection, not a tap
  const recordingMark = e.target.closest('mark.pron-recording');
  if (recordingMark) {
    const reading = currentReading();
    const saved = reading?.pronunciationRecordings?.find(r => r.id === recordingMark.dataset.hlId);
    if (saved) openPronunciationPractice({ term: saved.text, ipa: saved.expectedIpa, source: { readingId: reading.id, start: saved.start, end: saved.end } });
    return;
  }
  const mark = e.target.closest('mark.hl');
  if (!mark || mark.dataset.hlId === 'jump-temp') return;
  openHighlightEditMenu(mark.dataset.hlId, mark);
}

function buildExcerpt(sel) {
  if (sel.excerpt != null) return sel.excerpt;
  const preview = document.getElementById('reading-preview');
  const fullText = preview ? (preview.textContent || '') : '';
  const start = Math.max(0, sel.start - 60);
  const end = Math.min(fullText.length, sel.end + 60);
  return fullText.slice(start, end).trim();
}

function openLlmConfigModal() {
  document.getElementById('llm-base-url').value = state.llmConfig.baseUrl || '';
  document.getElementById('llm-api-key').value = state.llmConfig.apiKey || '';
  document.getElementById('llm-model').value = state.llmConfig.model || '';
  document.getElementById('auto-highlight-checkbox').checked = !!state.autoHighlightOnAdd;
  document.getElementById('settings-speech-rate').value = state.speechRate;
  document.getElementById('settings-rate-value').textContent = `${state.speechRate.toFixed(1)}x`;
  document.getElementById('piper-enabled-checkbox').checked = !!state.piperConfig.enabled;
  document.getElementById('piper-path-input').value = state.piperConfig.piperPath || '';
  document.getElementById('piper-model-input').value = state.piperConfig.modelPath || '';
  const provider = state.translateProvider || 'google';
  document.querySelectorAll('input[name="translateProvider"]').forEach((r) => { r.checked = r.value === provider; });
  document.getElementById('dictionary-path-input').value = state.dictionaryConfig.path || '';
  document.getElementById('custom-dictionary-path-input').value = state.customDictionaryConfig.path || '';
  document.getElementById('pronunciation-model-dir-input').value = state.pronunciationConfig.customModelDir || '';
  renderDefaultColorRow();
  setLlmTestStatus('', '');
  setPiperTestStatus('', '');
  setPronunciationDownloadStatus('', '');
  switchSettingsPane('highlight');
  document.getElementById('llm-config-backdrop').hidden = false;
}
function closeLlmConfigModal() {
  document.getElementById('llm-config-backdrop').hidden = true;
}
function switchSettingsPane(paneName) {
  document.querySelectorAll('.settings-nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pane === paneName);
  });
  document.querySelectorAll('.settings-pane').forEach((pane) => {
    pane.hidden = pane.dataset.pane !== paneName;
  });
}
function renderDefaultColorRow() {
  document.querySelectorAll('.default-color-swatch').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.color === state.defaultHighlightColor);
  });
}
function saveLlmConfig() {
  state.llmConfig = {
    baseUrl: document.getElementById('llm-base-url').value.trim(),
    apiKey: document.getElementById('llm-api-key').value.trim(),
    model: document.getElementById('llm-model').value.trim(),
  };
  state.autoHighlightOnAdd = document.getElementById('auto-highlight-checkbox').checked;
  state.piperConfig = {
    enabled: document.getElementById('piper-enabled-checkbox').checked,
    piperPath: document.getElementById('piper-path-input').value.trim(),
    modelPath: document.getElementById('piper-model-input').value.trim(),
  };
  const checkedProvider = document.querySelector('input[name="translateProvider"]:checked');
  state.translateProvider = checkedProvider ? checkedProvider.value : 'google';
  state.dictionaryConfig = { path: document.getElementById('dictionary-path-input').value.trim() };
  state.customDictionaryConfig = { path: document.getElementById('custom-dictionary-path-input').value.trim() };
  state.pronunciationConfig = { customModelDir: document.getElementById('pronunciation-model-dir-input').value.trim() };
  persist();
  closeLlmConfigModal();
}
function setPronunciationDownloadStatus(kind, message) {
  const el = document.getElementById('pronunciation-download-status');
  el.className = kind ? `field-hint field-${kind}` : 'field-hint';
  el.textContent = message;
}
async function browsePronunciationModelDir() {
  const dirPath = await window.api.browseFile({ title: 'Choose a phoneme model directory', directory: true });
  if (dirPath) document.getElementById('pronunciation-model-dir-input').value = dirPath;
}
async function downloadPronunciationModelFromSettings() {
  const btn = document.getElementById('btn-pronunciation-download');
  btn.disabled = true;
  setPronunciationDownloadStatus('', 'Downloading model (~317 MB, one-time download)…');
  const unsub = window.api.onPronunciationDownloadProgress(({ received, total }) => {
    if (total) setPronunciationDownloadStatus('', `Loading… ${Math.round((received / total) * 100)}%`);
  });
  const result = await window.api.ensurePronunciationModel({});
  unsub();
  btn.disabled = false;
  if (result && result.error) setPronunciationDownloadStatus('error', result.error);
  else setPronunciationDownloadStatus('success', 'Model is ready.');
}
function setLlmTestStatus(kind, message) {
  const el = document.getElementById('llm-test-status');
  el.className = kind ? `field-hint field-${kind}` : 'field-hint';
  el.textContent = message;
}
function setPiperTestStatus(kind, message) {
  const el = document.getElementById('piper-test-status');
  el.className = kind ? `field-hint field-${kind}` : 'field-hint';
  el.textContent = message;
}
async function browseDictionaryFile() {
  const filePath = await window.api.browseFile({
    title: 'Choose an English–Vietnamese dictionary file',
    filters: [{ name: 'Dictionary', extensions: ['json', 'txt', 'tsv', 'csv'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (filePath) document.getElementById('dictionary-path-input').value = filePath;
}
async function browsePiperExecutable() {
  const filePath = await window.api.browseFile({
    title: 'Choose Piper executable',
    filters: [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (filePath) document.getElementById('piper-path-input').value = filePath;
}
async function browsePiperModel() {
  const filePath = await window.api.browseFile({
    title: 'Choose voice model (.onnx)',
    filters: [{ name: 'ONNX Model', extensions: ['onnx'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (filePath) document.getElementById('piper-model-input').value = filePath;
}
async function testPiperFromModal() {
  const piperPath = document.getElementById('piper-path-input').value.trim();
  const modelPath = document.getElementById('piper-model-input').value.trim();
  const btn = document.getElementById('btn-piper-test');

  setPiperTestStatus('', 'Testing Piper…');
  btn.disabled = true;
  try {
    const result = await window.api.piperSpeak({ piperPath, modelPath, text: 'Hello, this is a Piper test.', rate: 1 });
    if (result && result.audioBase64) {
      setPiperTestStatus('success', 'Piper is working — playing a sample…');
      const bytes = Uint8Array.from(atob(result.audioBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/wav' });
      new Audio(URL.createObjectURL(blob)).play();
    } else {
      setPiperTestStatus('error', (result && result.error) || 'Piper test failed.');
    }
  } finally {
    btn.disabled = false;
  }
}
async function testLlmConnectionFromModal() {
  const baseUrl = document.getElementById('llm-base-url').value.trim();
  const apiKey = document.getElementById('llm-api-key').value.trim();
  const model = document.getElementById('llm-model').value.trim();
  const btn = document.getElementById('btn-llm-test');

  setLlmTestStatus('', 'Testing connection…');
  btn.disabled = true;
  try {
    const result = await window.api.testLlmConnection({ baseUrl, apiKey, model });
    if (result && result.ok) {
      setLlmTestStatus('success', `Connection successful — LLM response: "${result.reply}"`);
    } else {
      setLlmTestStatus('error', (result && result.error) || 'Test failed.');
    }
  } finally {
    btn.disabled = false;
  }
}
function isLlmConfigured() {
  return !!(state.llmConfig && state.llmConfig.baseUrl && state.llmConfig.apiKey && state.llmConfig.model);
}

function selectionContext(sel) {
  if (sel.excerpt != null) return sel.excerpt;
  const preview = document.getElementById('reading-preview');
  const fullText = preview ? preview.textContent || '' : '';
  return fullText.slice(Math.max(0, sel.start - 120), Math.min(fullText.length, sel.end + 120));
}

// Lookup (local Anh-Việt dictionary) and Translate (Google/LLM) are two
// separate, explicit actions in the bubble menu — not an either/or choice.
async function openDictionaryLookup(sel) {
  if (!state.customDictionaryConfig.path && !state.dictionaryConfig.path) {
    if (window.confirm('No English–Vietnamese dictionary is configured. Open Settings now?')) openLlmConfigModal();
    return;
  }

  state.lookupState = { status: 'loading', term: sel.text, selection: sel };
  document.getElementById('lookup-backdrop').hidden = false;
  renderLookupModal();

  // Check the user's own custom dictionary first (words they saved from
  // earlier LLM/Google translations) — it's smaller and free to re-check
  // even when the main downloaded dictionary is also configured.
  if (state.customDictionaryConfig.path) {
    const customResult = await window.api.dictLookup({ dictPath: state.customDictionaryConfig.path, term: sel.text });
    if (customResult && !customResult.error && customResult.entry) {
      state.lookupState = { status: 'done', term: sel.text, entry: customResult.entry, selection: sel, source: 'custom' };
      renderLookupModal();
      return;
    }
  }

  if (!state.dictionaryConfig.path) {
    state.lookupState = {
      status: 'error', message: `"${sel.text}" was not found in your custom dictionary.`,
      term: sel.text, selection: sel,
    };
    renderLookupModal();
    return;
  }

  const result = await window.api.dictLookup({ dictPath: state.dictionaryConfig.path, term: sel.text });
  if (result && !result.error && result.entry) {
    state.lookupState = { status: 'done', term: sel.text, entry: result.entry, selection: sel, source: 'dictionary' };
  } else {
    state.lookupState = {
      status: 'error', message: (result && result.error) || `"${sel.text}" was not found in the dictionary.`,
      term: sel.text, selection: sel,
    };
  }
  renderLookupModal();
}
function closeLookupModal() {
  document.getElementById('lookup-backdrop').hidden = true;
  state.lookupState = null;
}
// Reduces a structured dictionary entry down to the flat shape used by the
// vocabulary collections (term/meaning/ipa/pos/example/exampleTranslation).
function flattenLookupEntry(entry) {
  const pos = (entry.senses.find(s => s.pos)?.pos) || '';
  const meaning = entry.senses
    .map(s => s.definitions.map(d => (s.pos ? `(${s.pos}) ${d.text}` : d.text)).join('; '))
    .filter(Boolean)
    .join('; ');
  let example = '', exampleTranslation = '';
  for (const s of entry.senses) {
    for (const d of s.definitions) {
      if (d.examples && d.examples.length) {
        example = d.examples[0].en;
        exampleTranslation = d.examples[0].vi;
        break;
      }
    }
    if (example) break;
  }
  return { term: entry.term, meaning, ipa: entry.ipa || '', pos, example, exampleTranslation };
}
function renderLookupModal() {
  const body = document.getElementById('lookup-body');
  const addBtn = document.getElementById('btn-lookup-add');
  const ls = state.lookupState;
  if (!ls) { body.innerHTML = ''; addBtn.hidden = true; return; }

  if (ls.status === 'loading') {
    body.innerHTML = `<div class="translate-loading">Looking up "${escapeHtml(ls.term)}"…</div>`;
    addBtn.hidden = true;
    return;
  }
  if (ls.status === 'error') {
    body.innerHTML = `
      <div class="translate-error">${escapeHtml(ls.message)}</div>
      <button type="button" class="btn btn-ghost llm-fallback-btn" id="btn-lookup-translate-fallback">Translate with ${escapeHtml(providerLabel(state.translateProvider))} →</button>
    `;
    addBtn.hidden = true;
    document.getElementById('btn-lookup-translate-fallback').addEventListener('click', () => {
      const sel = ls.selection;
      closeLookupModal();
      openTranslate(sel);
    });
    return;
  }

  const entry = ls.entry;
  const speakerIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.72"/></svg>';

  const sensesHtml = entry.senses.map(s => `
    <div class="lookup-sense">
      ${s.pos ? `<div class="lookup-pos">${escapeHtml(s.pos)}</div>` : ''}
      <ol class="lookup-defs">
        ${s.definitions.map(d => `
          <li>${escapeHtml(d.text)}
            ${d.examples.map(ex => `<div class="lookup-example">"${escapeHtml(ex.en)}"${ex.vi ? ` — ${escapeHtml(ex.vi)}` : ''}</div>`).join('')}
          </li>
        `).join('')}
      </ol>
    </div>
  `).join('');

  const idiomsHtml = entry.idioms.length ? `
    <div class="lookup-idioms">
      <div class="lookup-section-title">Idioms / phrases</div>
      ${entry.idioms.map(idiom => `
        <div class="lookup-idiom">
          <div class="lookup-idiom-phrase">${escapeHtml(idiom.phrase)}</div>
          <div class="lookup-idiom-def">${escapeHtml(idiom.definitions.join('; '))}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  body.innerHTML = `
    <div class="translate-source-tag">${escapeHtml(providerLabel(ls.source))}</div>
    <div class="lookup-term-row">
      <span class="lookup-term">${escapeHtml(entry.term)}</span>
      ${entry.ipa ? `<span class="lookup-ipa">${escapeHtml(entry.ipa)}</span>` : ''}
      <button type="button" class="btn btn-ghost btn-icon" id="btn-lookup-speak" aria-label="Pronunciation" title="Pronunciation">${speakerIcon}</button>
    </div>
    <div class="speech-rate-row">
      <span>Speech rate</span>
      <input type="range" id="lookup-speech-rate" min="0.5" max="1.5" step="0.1" value="${state.speechRate}">
      <span class="rate-value" id="lookup-speech-rate-value">${state.speechRate.toFixed(1)}x</span>
    </div>
    ${sensesHtml}
    ${idiomsHtml}
  `;
  addBtn.hidden = false;

  document.getElementById('btn-lookup-speak').addEventListener('click', () => speak(entry.term, state.speechRate));
  document.getElementById('lookup-speech-rate').addEventListener('input', (e) => {
    state.speechRate = parseFloat(e.target.value);
    document.getElementById('lookup-speech-rate-value').textContent = `${state.speechRate.toFixed(1)}x`;
  });
  document.getElementById('lookup-speech-rate').addEventListener('change', () => persist());
}

// ============================================================================
// Pronunciation scoring — record yourself saying a word/phrase and compare
// the phonemes against the dictionary's IPA using an offline phoneme
// recognizer that runs in the main process (see main.js: scorePronunciation).
// ============================================================================
const PHONEME_VOCAB = ['aɪ', 'aʊ', 'eɪ', 'oʊ', 'ɔɪ', 'ʤ', 'ʧ', 'æ', 'ð', 'ŋ', 'ɑ', 'ɔ', 'ə', 'ɛ', 'ɝ', 'ɪ', 'ɹ', 'ɾ', 'ʃ', 'ʊ', 'θ',
  'b', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'p', 's', 't', 'u', 'v', 'w', 'z'];
// Longest-first so multi-character symbols (diphthongs, affricates) match
// before their component letters.
const PHONEME_VOCAB_SORTED = [...PHONEME_VOCAB].sort((a, b) => b.length - a.length);

// British/RP -> General American substitutions. The bundled EN-VI dictionary
// leans British IPA while the phoneme model was trained on American speech
// (TIMIT) — best-effort v1 mapping, not a full accent conversion.
const IPA_BRITISH_TO_AMERICAN = [
  [/əʊ/g, 'oʊ'], [/ɒ/g, 'ɑ'], [/ɜː?/g, 'ɝ'], [/ɑː/g, 'ɑ'], [/iː/g, 'i'], [/uː/g, 'u'], [/ɔː/g, 'ɔ'], [/r/g, 'ɹ'],
];

function ipaToPhones(ipaRaw) {
  if (!ipaRaw) return [];
  let s = ipaRaw.replace(/[/[\]]/g, '').replace(/[ˈˌ.ʼ'ː]/g, '').trim().toLowerCase();
  for (const [pattern, replacement] of IPA_BRITISH_TO_AMERICAN) s = s.replace(pattern, replacement);
  const phones = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    const match = PHONEME_VOCAB_SORTED.find(p => s.startsWith(p, i));
    if (match) { phones.push(match); i += match.length; } else { i++; }
  }
  return phones;
}


// Expected phonemes for arbitrary selected text: look up each word in the
// configured dictionaries (custom first, same precedence as Lookup) and
// concatenate their IPA. Words with no entry are reported, not guessed.
async function getExpectedPhonesForText(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { phones: [], ipa: '', missingWords: [] };
  if (!state.customDictionaryConfig.path && !state.dictionaryConfig.path) {
    return { phones: [], ipa: '', missingWords: words };
  }
  const allPhones = [];
  const ipaParts = [];
  const missingWords = [];
  for (const word of words) {
    let entry = null;
    if (state.customDictionaryConfig.path) {
      const r = await window.api.dictLookup({ dictPath: state.customDictionaryConfig.path, term: word });
      if (r && !r.error && r.entry) entry = r.entry;
    }
    if (!entry && state.dictionaryConfig.path) {
      const r = await window.api.dictLookup({ dictPath: state.dictionaryConfig.path, term: word });
      if (r && !r.error && r.entry) entry = r.entry;
    }
    if (entry && entry.ipa) {
      ipaParts.push(entry.ipa);
      allPhones.push(...ipaToPhones(entry.ipa));
    } else {
      missingWords.push(word);
    }
  }
  return { phones: allPhones, ipa: ipaParts.join(' '), missingWords };
}

function encodeWavPCM16(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
function resamplePCMLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const out = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

let pronunciationAudioCtx = null;
let pronunciationMediaStream = null;
let pronunciationProcessorNode = null;
let pronunciationSourceNode = null;
let pronunciationMuteGain = null;
let pronunciationCapturedChunks = [];
let pronunciationRecordedBlobUrl = null;
let pronunciationDownloadUnsub = null;
let pronunciationPlayback = null;
let pronunciationPlaybackUrl = null;
let pronunciationPlaybackVersion = 0;

function pronunciationDocument(source) {
  return source?.lessonId ? state.listeningLessons.find(l => l.id === source.lessonId) : state.readings.find(r => r.id === source?.readingId);
}
function pronunciationHistory(ps) {
  const reading = pronunciationDocument(ps?.source);
  return (reading?.pronunciationRecordings || []).filter(r => r.start === ps.source.start && r.end === ps.source.end && r.text === ps.term && r.sentenceId === ps.source.sentenceId && r.field === ps.source.field).sort((a, b) => b.createdAt - a.createdAt);
}
function stopPronunciationPlayback() {
  pronunciationPlaybackVersion++;
  if (pronunciationPlayback) { pronunciationPlayback.pause(); pronunciationPlayback = null; }
  if (pronunciationPlaybackUrl) { URL.revokeObjectURL(pronunciationPlaybackUrl); pronunciationPlaybackUrl = null; }
  window.speechSynthesis?.cancel();
  if (currentPiperAudio) currentPiperAudio.pause();
}
async function playPronunciationAudio(ps, recording) {
  stopPronunciationPlayback();
  const version = pronunciationPlaybackVersion;
  let url;
  try {
    url = recording ? URL.createObjectURL(new Blob([await window.api.readPronunciationRecording(recording.id)], { type: 'audio/wav' })) : ps.audioUrl;
    if (state.pronunciationState !== ps || version !== pronunciationPlaybackVersion) { if (recording && url) URL.revokeObjectURL(url); return; }
    if (recording) pronunciationPlaybackUrl = url;
    pronunciationPlayback = new Audio(url);
    await pronunciationPlayback.play();
  } catch (err) {
    if (recording && url) URL.revokeObjectURL(url);
    if (state.pronunciationState === ps) { ps.saveError = 'Unable to play recording: ' + err.message; renderPronunciationModal(); }
  }
}
async function playPronunciationReference(ps) {
  stopPronunciationPlayback();
  const version = pronunciationPlaybackVersion;
  if (isPiperConfigured()) {
    try {
      const result = await window.api.piperSpeak({ ...state.piperConfig, text: ps.term, rate: state.speechRate });
      if (state.pronunciationState !== ps || version !== pronunciationPlaybackVersion) return;
      if (result?.audioBase64) {
        pronunciationPlaybackUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0))], { type: 'audio/wav' }));
        pronunciationPlayback = new Audio(pronunciationPlaybackUrl);
        await pronunciationPlayback.play();
        return;
      }
    } catch { /* Use the system voice if Piper is unavailable. */ }
  }
  if (state.pronunciationState !== ps || version !== pronunciationPlaybackVersion) return;
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(ps.term);
    utterance.lang = 'en-US';
    utterance.rate = state.speechRate || 1;
    window.speechSynthesis.speak(utterance);
  }
}
async function savePronunciationTake(ps, blob) {
  if (!ps.source) return;
  const reading = pronunciationDocument(ps.source);
  if (!reading) return;
  ps.saving = true;
  ps.saveError = null;
  renderPronunciationModal();
  try {
    const { id } = await window.api.savePronunciationRecording(new Uint8Array(await blob.arrayBuffer()));
    const take = { id, ...ps.source, text: ps.term, expectedIpa: ps.expectedIpa || '', createdAt: Date.now() };
    reading.pronunciationRecordings ||= [];
    reading.pronunciationRecordings.push(take);
    try { await persist(); } catch (err) { reading.pronunciationRecordings = reading.pronunciationRecordings.filter(r => r !== take); throw err; }
    ps.savedTake = take;
    if (ps.source.lessonId) { if (state.section === 'listening') window.Listening?.render(); }
    else if (currentReading()?.id === reading.id) renderReadingDetail();
  } catch (err) {
    ps.saveError = 'Unable to save recording: ' + err.message;
  } finally {
    ps.saving = false;
    if (state.pronunciationState === ps) renderPronunciationModal();
  }
}

async function teardownPronunciationAudioGraph() {
  if (!pronunciationAudioCtx) return null;
  const context = pronunciationAudioCtx;
  pronunciationAudioCtx = null;
  pronunciationSourceNode.disconnect();
  pronunciationProcessorNode.disconnect();
  if (pronunciationMuteGain) pronunciationMuteGain.disconnect();
  const sampleRate = context.sampleRate;
  pronunciationMediaStream.getTracks().forEach(t => t.stop());
  await context.close();
  return sampleRate;
}

async function startPronunciationRecording() {
  const ps = state.pronunciationState;
  if (!ps || !ps.modelReady || ['recording', 'processing', 'requesting'].includes(ps.phase)) return;
  stopPronunciationPlayback();
  ps.savedTake = null;
  ps.overallScore = null;
  ps.phoneScores = [];
  ps.phase = 'requesting';
  renderPronunciationModal();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    ps.phase = 'error';
    ps.error = 'Audio recording is not supported in this app.';
    renderPronunciationModal();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (state.pronunciationState !== ps) { stream.getTracks().forEach(t => t.stop()); return; }
    pronunciationMediaStream = stream;
  } catch (err) {
    ps.phase = 'error';
    ps.error = `Unable to access the microphone: ${err.message}`;
    renderPronunciationModal();
    return;
  }

  pronunciationAudioCtx = new AudioContext();
  pronunciationSourceNode = pronunciationAudioCtx.createMediaStreamSource(pronunciationMediaStream);
  pronunciationProcessorNode = pronunciationAudioCtx.createScriptProcessor(4096, 1, 1);
  pronunciationMuteGain = pronunciationAudioCtx.createGain();
  pronunciationMuteGain.gain.value = 0; // capture only, don't echo the mic to speakers
  pronunciationCapturedChunks = [];
  pronunciationProcessorNode.onaudioprocess = (e) => {
    pronunciationCapturedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  pronunciationSourceNode.connect(pronunciationProcessorNode);
  pronunciationProcessorNode.connect(pronunciationMuteGain);
  pronunciationMuteGain.connect(pronunciationAudioCtx.destination);

  ps.phase = 'recording';
  ps.error = null;
  renderPronunciationModal();
}

async function stopPronunciationRecording() {
  const ps = state.pronunciationState;
  if (!pronunciationAudioCtx || !ps) return;
  ps.phase = 'processing';
  renderPronunciationModal();

  const totalLength = pronunciationCapturedChunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of pronunciationCapturedChunks) { merged.set(chunk, offset); offset += chunk.length; }
  const sampleRate = await teardownPronunciationAudioGraph();
  if (state.pronunciationState !== ps) return;
  if (!merged.length) { ps.phase = 'error'; ps.error = 'No audio was captured. Please record again.'; renderPronunciationModal(); return; }

  if (pronunciationRecordedBlobUrl) URL.revokeObjectURL(pronunciationRecordedBlobUrl);
  const recordedBlob = encodeWavPCM16(merged, sampleRate);
  pronunciationRecordedBlobUrl = URL.createObjectURL(recordedBlob);

  ps.phase = 'processing';
  ps.audioUrl = pronunciationRecordedBlobUrl;
  renderPronunciationModal();
  await savePronunciationTake(ps, recordedBlob);

  if (!ps.expectedPhones.length) {
    // No dictionary reference to force-align against — nothing to score.
    ps.phase = 'done';
    renderPronunciationModal();
    return;
  }

  const resampled = resamplePCMLinear(merged, sampleRate, 16000);
  const result = await window.api.scorePronunciation({
    samples: resampled,
    sampleRate: 16000,
    targetPhones: ps.expectedPhones,
    customModelDir: state.pronunciationConfig.customModelDir || undefined,
  }).catch(err => ({ error: err.message }));

  if (ps.savedTake && result && !result.error) {
    ps.savedTake.phoneScores = result.phones || [];
    ps.savedTake.overallScore = result.overallScore;
    await persist().catch(err => { ps.saveError = 'Unable to save score: ' + err.message; });
  }

  const cur = state.pronunciationState;
  if (!cur || cur !== ps) return; // dialog closed/reopened while scoring ran
  if (!result || result.error) {
    ps.phase = 'error';
    ps.error = (result && result.error) || 'Pronunciation scoring failed.';
    renderPronunciationModal();
    return;
  }
  ps.phoneScores = result.phones || [];
  ps.overallScore = result.overallScore;
  ps.phase = 'done';
  renderPronunciationModal();
}

async function abortPronunciationRecording() {
  if (pronunciationAudioCtx) await teardownPronunciationAudioGraph();
}

async function ensurePronunciationModelReady() {
  const ps = state.pronunciationState;
  if (!ps) return;
  if (pronunciationDownloadUnsub) { pronunciationDownloadUnsub(); pronunciationDownloadUnsub = null; }
  pronunciationDownloadUnsub = window.api.onPronunciationDownloadProgress(({ received, total }) => {
    if (state.pronunciationState !== ps) return;
    ps.modelProgress = total ? Math.round((received / total) * 100) : null;
    renderPronunciationModal();
  });
  const result = await window.api.ensurePronunciationModel({
    customModelDir: state.pronunciationConfig.customModelDir || undefined,
  }).catch(err => ({ error: err.message }));
  if (state.pronunciationState !== ps) return;
  if (pronunciationDownloadUnsub) { pronunciationDownloadUnsub(); pronunciationDownloadUnsub = null; }
  if (result && result.error) {
    ps.phase = 'error';
    ps.error = result.error;
  } else {
    ps.modelReady = true;
    if (ps.phase === 'preparing') ps.phase = 'idle';
  }
  renderPronunciationModal();
}

async function openPronunciationPractice({ term, ipa, needsLookup, source }) {
  window.Listening?.stopAudio();
  stopReadAloud();
  stopPronunciationPlayback();
  const ps = { status: 'open', phase: 'preparing', term, source, expectedPhones: [], modelReady: false, modelProgress: null, audioUrl: null };
  state.pronunciationState = ps;
  document.getElementById('pronunciation-backdrop').hidden = false;
  renderPronunciationModal();

  const history = pronunciationHistory(ps);
  if (history.length) {
    const latest = history[0];
    ps.expectedIpa = latest.expectedIpa;
    ps.expectedPhones = ipaToPhones(latest.expectedIpa || '');
    ps.overallScore = latest.overallScore;
    ps.phoneScores = latest.phoneScores;
    ps.phase = 'done';
    renderPronunciationModal();
    return;
  }

  let expectedIpa = ipa || '';
  let expectedPhones = ipa ? ipaToPhones(ipa) : [];
  let missingWords = [];
  if (needsLookup || !ipa) {
    const result = await getExpectedPhonesForText(term).catch(() => ({ phones: [], ipa: '', missingWords: [term] }));
    expectedPhones = result.phones;
    expectedIpa = result.ipa;
    missingWords = result.missingWords;
  }
  if (state.pronunciationState !== ps) return; // closed/reopened meanwhile
  ps.expectedIpa = expectedIpa;
  ps.expectedPhones = expectedPhones;
  ps.missingWords = missingWords;
  if (!expectedPhones.length) { ps.modelReady = true; ps.phase = 'idle'; }
  renderPronunciationModal();
  if (expectedPhones.length) await ensurePronunciationModelReady();
}

async function togglePronunciationRecording() {
  const ps = state.pronunciationState;
  if (!ps || ['preparing', 'processing', 'requesting'].includes(ps.phase)) return;
  if (ps.phase === 'recording') { await stopPronunciationRecording(); return; }
  if (!ps.modelReady) {
    if (!ps.expectedPhones.length) ps.modelReady = true;
    else { ps.phase = 'preparing'; renderPronunciationModal(); await ensurePronunciationModelReady(); }
  }
  if (state.pronunciationState === ps) await startPronunciationRecording();
}

document.addEventListener('keydown', async event => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.code !== 'KeyR' || event.repeat) return;
  if (state.pronunciationState) {
    event.preventDefault();
    await togglePronunciationRecording();
    return;
  }
  if (state.section === 'listening') window.Listening?.captureSelection();
  else if (state.section === 'reading' && currentReading()) onReadingPreviewMouseUp();
  else return;
  const selected = state.pendingSelection;
  if (!selected) return;
  event.preventDefault();
  const source = selected.source;
  window.getSelection().removeAllRanges();
  hideSelectionMenu();
  const opening = openPronunciationPractice({ term: selected.text, needsLookup: true, source });
  const ps = state.pronunciationState;
  await opening;
  if (state.pronunciationState === ps) await togglePronunciationRecording();
});

function closePronunciationModal() {
  stopPronunciationPlayback();
  document.getElementById('pronunciation-backdrop').hidden = true;
  if (pronunciationDownloadUnsub) { pronunciationDownloadUnsub(); pronunciationDownloadUnsub = null; }
  if (state.pronunciationState && state.pronunciationState.phase === 'recording') abortPronunciationRecording();
  state.pronunciationState = null;
  if (pronunciationRecordedBlobUrl) { URL.revokeObjectURL(pronunciationRecordedBlobUrl); pronunciationRecordedBlobUrl = null; }
}

function pronScoreBand(score) {
  if (score >= 85) return 'great';
  if (score >= 60) return 'ok';
  return 'poor';
}

function renderPronunciationModal() {
  const body = document.getElementById('pronunciation-body');
  const ps = state.pronunciationState;
  if (!body) return;
  if (!ps) { body.innerHTML = ''; return; }

  const speakerIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.72"/></svg>';
  const micIcon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

  const ipaLine = ps.expectedIpa
    ? `<div class="pron-expected-ipa">${escapeHtml(ps.expectedIpa)}</div>`
    : (ps.missingWords && ps.missingWords.length
      ? `<div class="field-hint">No IPA found for: ${escapeHtml(ps.missingWords.join(', '))} — only recognized pronunciation will be shown; no score is available.</div>`
      : '');

  let resultHtml = '';
  if (ps.phase === 'error') {
    resultHtml = `<div class="translate-error">${escapeHtml(ps.error || 'Something went wrong.')}</div>`;
  } else if (ps.phase === 'done') {
    if (ps.overallScore != null) {
      const displayScore = Math.min(100, Math.max(0, Math.round(Number(ps.overallScore) || 0)));
      const chipsHtml = (ps.phoneScores || []).map(p => {
        if (p.score == null) return `<span class="phone-chip phone-del" title="Not recognized">${escapeHtml(p.phone)}</span>`;
        return `<span class="phone-chip phone-${pronScoreBand(p.score)}" title="${p.score}/100">${escapeHtml(p.phone)}</span>`;
      }).join('');
      resultHtml = `
        <div class="pron-score" style="--score: ${displayScore}" role="img" aria-label="Pronunciation score: ${displayScore} percent">
          <div class="pron-score-value">${displayScore}<span>%</span></div>
        </div>
        <div class="pron-phone-row">${chipsHtml}</div>
        <div class="field-hint">Green = good · Yellow = fair · Red = incorrect (hover to see each phoneme score)</div>
      `;
    } else {
      resultHtml = `<div class="field-hint">${ps.expectedPhones?.length ? 'No score is available for this recording.' : 'No reference IPA is available for scoring.'} You can still replay your recordings.</div>`;
    }
  }

  const hintText = ps.phase === 'preparing'
    ? (ps.modelProgress != null ? `Downloading phoneme model (one-time download)… ${ps.modelProgress}%` : 'Preparing phoneme model…')
    : ps.phase === 'requesting' ? 'Waiting for microphone access…'
    : ps.phase === 'recording' ? 'Recording… click or press Alt+R to stop'
      : ps.phase === 'processing' ? 'Processing…'
        : 'Click or press Alt+R to record';

  const history = pronunciationHistory(ps);
  const historyHtml = history.length ? `<section class="pron-history"><h3>Saved Recordings</h3><p class="field-hint">Compare your recordings with the reference pronunciation.</p>${history.map(take => `
    <div class="pron-history-item"><div>${new Date(take.createdAt).toLocaleString('en-GB')}${take.overallScore != null ? ` · ${take.overallScore}/100` : ''}</div>
    <div class="pron-compare-actions"><button type="button" class="btn btn-secondary" data-play-recording="${escapeHtml(take.id)}">Play Recording</button><button type="button" class="btn btn-secondary" data-play-reference>Play Reference</button></div></div>`).join('')}</section>` : '';

  body.innerHTML = `
    <div class="pron-term-row">
      <span class="pron-term">${escapeHtml(ps.term)}</span>
      <button type="button" class="btn btn-ghost btn-icon" id="btn-pron-speak" aria-label="Listen to reference" title="Listen to reference pronunciation">${speakerIcon}</button>
    </div>
    ${ipaLine}
    <div class="pron-record-row">
      <button type="button" class="pron-record-btn ${ps.phase === 'recording' ? 'is-recording' : ''}" id="btn-pron-record" aria-label="${ps.phase === 'recording' ? 'Stop recording' : 'Record pronunciation'}" aria-keyshortcuts="Alt+R" ${['processing', 'preparing', 'requesting'].includes(ps.phase) ? 'disabled' : ''}>${micIcon}</button>
      <span class="field-hint">${hintText}</span>
      ${ps.audioUrl ? `<button type="button" class="btn btn-ghost btn-icon" id="btn-pron-play" aria-label="Replay" title="Replay recording">${speakerIcon}</button>` : ''}
    </div>
    ${resultHtml}
    ${ps.source ? `<p class="field-hint" role="status">${ps.saving ? 'Saving recording…' : ps.savedTake ? (ps.source.lessonId ? 'Recording saved. Open Saved Recordings in this practice to listen again.' : 'Recording saved. Click the underlined text in Reading to listen again.') : (ps.source.lessonId ? 'Recordings are saved automatically to this lesson.' : 'Recordings are saved automatically to this reading.')}</p>` : ''}
    ${ps.saveError ? `<p class="translate-error" role="alert">${escapeHtml(ps.saveError)}</p>` : ''}
    ${historyHtml}
  `;

  const playReference = () => playPronunciationReference(ps);
  document.getElementById('btn-pron-speak').addEventListener('click', playReference);
  body.querySelectorAll('[data-play-reference]').forEach(btn => btn.addEventListener('click', playReference));
  body.querySelectorAll('[data-play-recording]').forEach(btn => btn.addEventListener('click', () => playPronunciationAudio(ps, history.find(take => take.id === btn.dataset.playRecording))));
  document.getElementById('btn-pron-record').addEventListener('click', togglePronunciationRecording);
  const playBtn = document.getElementById('btn-pron-play');
  if (playBtn) playBtn.addEventListener('click', () => playPronunciationAudio(ps));
}

function openTranslate(sel) {
  const provider = state.translateProvider || 'google';
  if (provider === 'llm') return openTranslateWithLlm(sel);
  return openTranslateWithGoogle(sel);
}

async function openTranslateWithGoogle(sel) {
  const request = { status: 'loading', term: sel.text, selection: sel, source: 'google' };
  state.translateState = request;
  document.getElementById('translate-backdrop').hidden = false;
  renderTranslateModal();

  let result;
  try { result = await window.api.googleTranslate({ text: sel.text, targetLang: 'vi' }); }
  catch (err) { result = { error: err.message || 'Translation failed.' }; }
  if (state.translateState !== request) return;

  if (!result || result.error) {
    state.translateState = { status: 'error', message: result?.error || 'Translation unavailable.', term: sel.text, selection: sel, source: 'google' };
  } else {
    state.translateState = {
      status: 'done', term: sel.text, meaning: result.translation, ipa: '', pos: '', example: '', exampleTranslation: '',
      selection: sel, previousExamples: [], source: 'google',
    };
    const ts = state.translateState;
    ts.enriching = true;
    renderTranslateModal();
    const details = await getGoogleTranslationDetails(sel);
    if (state.translateState !== ts) return;
    Object.assign(ts, details, { enriching: false });
  }
  renderTranslateModal();
}

async function getGoogleTranslationDetails(sel) {
  const details = { ipa: '', pos: '', example: '', exampleTranslation: '', detailSources: [] };
  for (const [dictPath, label] of [
    [state.customDictionaryConfig.path, 'Personal dictionary'],
    [state.dictionaryConfig.path, 'English–Vietnamese dictionary'],
  ]) {
    if (!dictPath) continue;
    try {
      const result = await window.api.dictLookup({ dictPath, term: sel.text });
      if (!result?.entry || result.error) continue;
      const entry = flattenLookupEntry(result.entry);
      let used = false;
      for (const key of ['ipa', 'pos']) {
        if (!details[key] && entry[key]) { details[key] = entry[key]; used = true; }
      }
      if (!details.example && entry.example) {
        details.example = entry.example;
        details.exampleTranslation = entry.exampleTranslation || '';
        used = true;
      }
      if (used) details.detailSources.push(label);
    } catch { /* Optional details must not discard a successful translation. */ }
  }
  if (!details.example) {
    const context = selectionContext(sel);
    if (context && context.trim() !== sel.text.trim()) {
      details.example = context;
      details.detailSources.push('Reading excerpt');
    }
  }
  if (details.example && !details.exampleTranslation) {
    try {
      const result = await window.api.googleTranslate({ text: details.example, targetLang: 'vi' });
      if (result && !result.error) details.exampleTranslation = result.translation || '';
    } catch { /* Preserve the example when its translation is unavailable. */ }
  }
  return details;
}

async function openTranslateWithLlm(sel) {
  if (!isLlmConfigured()) {
    if (window.confirm('LLM is not configured. Open Settings now?')) openLlmConfigModal();
    return;
  }
  const context = selectionContext(sel);

  state.translateState = { status: 'loading', term: sel.text, selection: sel, source: 'llm' };
  document.getElementById('translate-backdrop').hidden = false;
  renderTranslateModal();

  const result = await window.api.translateWithLlm({
    baseUrl: state.llmConfig.baseUrl,
    apiKey: state.llmConfig.apiKey,
    model: state.llmConfig.model,
    term: sel.text,
    context,
  });

  if (result && result.error) {
    state.translateState = { status: 'error', message: result.error, term: sel.text, selection: sel, source: 'llm' };
  } else {
    state.translateState = { status: 'done', ...result, selection: sel, previousExamples: [], source: 'llm' };
  }
  renderTranslateModal();
}
function closeTranslateModal() {
  document.getElementById('translate-backdrop').hidden = true;
  state.translateState = null;
}
async function fetchAnotherExample() {
  const ts = state.translateState;
  if (!ts || ts.status !== 'done' || ts.loadingExample) return;
  if (!isLlmConfigured()) {
    if (window.confirm('LLM is not configured. Open Settings now?')) openLlmConfigModal();
    return;
  }
  const context = selectionContext(ts.selection);
  const previousExamples = [...(ts.previousExamples || []), ts.example].filter(Boolean);

  ts.loadingExample = true;
  renderTranslateModal();

  const result = await window.api.fetchAnotherExample({
    baseUrl: state.llmConfig.baseUrl,
    apiKey: state.llmConfig.apiKey,
    model: state.llmConfig.model,
    term: ts.term,
    context,
    previousExamples,
  });

  ts.loadingExample = false;
  if (state.translateState !== ts) return; // dialog was closed/reopened while awaiting
  if (result && !result.error) {
    ts.previousExamples = previousExamples;
    ts.example = result.example;
    ts.exampleTranslation = result.exampleTranslation;
  } else {
    window.alert((result && result.error) || 'Unable to fetch another example.');
  }
  renderTranslateModal();
}
function highlightTermInText(text, term) {
  if (!text) return '';
  if (!term) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + term.length);
  const after = text.slice(idx + term.length);
  return `${escapeHtml(before)}<strong>${escapeHtml(match)}</strong>${escapeHtml(after)}`;
}
function providerLabel(source) {
  if (source === 'google') return 'Google Translate';
  if (source === 'llm') return 'LLM';
  if (source === 'custom') return 'Your dictionary';
  return 'English–Vietnamese dictionary';
}
function llmFallbackButtonHtml(ts) {
  if (ts.source === 'llm') return '';
  return `<button type="button" class="btn btn-ghost llm-fallback-btn" id="btn-translate-llm-fallback">Detailed translation with LLM →</button>`;
}
function wireLlmFallbackButton(ts) {
  const btn = document.getElementById('btn-translate-llm-fallback');
  if (btn) btn.addEventListener('click', () => openTranslateWithLlm(ts.selection));
}
function renderTranslateModal() {
  const body = document.getElementById('translate-body');
  const addBtn = document.getElementById('btn-translate-add');
  const addDictBtn = document.getElementById('btn-add-custom-dict');
  const ts = state.translateState;
  if (!ts) { body.innerHTML = ''; addBtn.hidden = true; addDictBtn.hidden = true; return; }

  if (ts.status === 'loading') {
    body.innerHTML = `<div class="translate-source-tag">${escapeHtml(providerLabel(ts.source))}</div><div class="translate-loading">Translating "${escapeHtml(ts.term)}"…</div>`;
    addBtn.hidden = true;
    addDictBtn.hidden = true;
  } else if (ts.status === 'error') {
    body.innerHTML = `
      <div class="translate-source-tag">${escapeHtml(providerLabel(ts.source))}</div>
      <div class="translate-error">${escapeHtml(ts.message)}</div>
      ${llmFallbackButtonHtml(ts)}
    `;
    addBtn.hidden = true;
    addDictBtn.hidden = true;
    wireLlmFallbackButton(ts);
  } else {
    const speakerIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.72"/></svg>';
    body.innerHTML = `
      <div class="translate-source-tag">${escapeHtml(providerLabel(ts.source))}</div>
      <div class="translate-field">
        <label>Term</label>
        <div class="val term-row">
          <span>${escapeHtml(ts.term || '')}</span>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-speak-term" aria-label="Pronunciation" title="Pronunciation">${speakerIcon}</button>
        </div>
      </div>
      <div class="speech-rate-row">
        <span>Speech rate</span>
        <input type="range" id="speech-rate" min="0.5" max="1.5" step="0.1" value="${state.speechRate}">
        <span class="rate-value" id="speech-rate-value">${state.speechRate.toFixed(1)}x</span>
      </div>
      <div class="translate-field"><label>Meaning</label><div class="val">${escapeHtml(ts.meaning || '—')}</div></div>
      <div class="translate-field"><label>IPA</label><div class="val">${escapeHtml(ts.ipa || '—')}</div></div>
      <div class="translate-field"><label>Part of speech</label><div class="val">${escapeHtml(ts.pos || '—')}</div></div>
      <div class="translate-field">
        <div class="example-label-row">
          <label>Example</label>
          <button type="button" class="btn btn-ghost example-more-btn" id="btn-more-example" ${ts.loadingExample ? 'disabled' : ''}>${ts.loadingExample ? 'Loading…' : 'Another example'}</button>
        </div>
        <div class="val term-row">
          <span>${ts.example ? highlightTermInText(ts.example, ts.term) : '—'}</span>
          ${ts.example ? `<button type="button" class="btn btn-ghost btn-icon" id="btn-speak-example" aria-label="Play example" title="Play example">${speakerIcon}</button>` : ''}
        </div>
      </div>
      <div class="translate-field"><label>Example (Vietnamese)</label><div class="val">${escapeHtml(ts.exampleTranslation || '—')}</div></div>
      ${llmFallbackButtonHtml(ts)}
    `;
    addBtn.hidden = false;
    addDictBtn.hidden = false;
    addDictBtn.disabled = false;
    addDictBtn.lastChild.textContent = 'Add to my dictionary';

    document.getElementById('btn-speak-term').addEventListener('click', () => speak(ts.term, state.speechRate));
    const speakExampleBtn = document.getElementById('btn-speak-example');
    if (speakExampleBtn) speakExampleBtn.addEventListener('click', () => speak(ts.example, state.speechRate));
    document.getElementById('btn-more-example').addEventListener('click', fetchAnotherExample);
    wireLlmFallbackButton(ts);

    document.getElementById('speech-rate').addEventListener('input', (e) => {
      state.speechRate = parseFloat(e.target.value);
      document.getElementById('speech-rate-value').textContent = `${state.speechRate.toFixed(1)}x`;
    });
    document.getElementById('speech-rate').addEventListener('change', () => persist());
  }
}

// Saves the current Translate result (from Google/LLM) into the user's own
// custom dictionary file, so the same word is found instantly for free next
// time instead of being translated again.
async function addCurrentTranslateToCustomDictionary() {
  const ts = state.translateState;
  if (!ts || ts.status !== 'done') return;

  if (!state.customDictionaryConfig.path) {
    if (window.confirm('No custom dictionary is configured. Open Settings now?')) openLlmConfigModal();
    return;
  }

  const btn = document.getElementById('btn-add-custom-dict');
  btn.disabled = true;
  try {
    const result = await window.api.addCustomDictionaryEntry({
      dictPath: state.customDictionaryConfig.path,
      entry: {
        term: ts.term,
        meaning: ts.meaning || '',
        ipa: ts.ipa || '',
        pos: ts.pos || '',
        example: ts.example || '',
        exampleTranslation: ts.exampleTranslation || '',
      },
    });
    if (result && result.error) {
      window.alert(result.error);
      btn.disabled = false;
    } else {
      btn.lastChild.textContent = 'Saved ✓';
    }
  } catch (err) {
    window.alert(`Unable to save: ${err.message}`);
    btn.disabled = false;
  }
}

function openAddToCollectionModal() {
  const select = document.getElementById('collection-select');
  select.innerHTML = '';
  for (const c of state.vocabCollections) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.words.length})`;
    select.appendChild(opt);
  }
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ New collection';
  select.appendChild(newOpt);
  const lastUsed = state.vocabCollections.find(c => c.id === state.lastUsedCollectionId);
  select.value = lastUsed ? lastUsed.id : (state.vocabCollections[0]?.id || '__new__');
  const isNew = select.value === '__new__';
  document.getElementById('new-collection-field').hidden = !isNew;
  document.getElementById('new-collection-name').value = '';
  document.getElementById('new-collection-error').hidden = true;
  document.getElementById('add-to-collection-backdrop').hidden = false;
  if (isNew) {
    // Focus after the backdrop becomes visible, otherwise the browser can't focus a hidden field.
    setTimeout(() => document.getElementById('new-collection-name').focus(), 0);
  }
}
function closeAddToCollectionModal() {
  document.getElementById('add-to-collection-backdrop').hidden = true;
  state.pendingWord = null;
}
function confirmAddToCollection() {
  const select = document.getElementById('collection-select');
  const word = state.pendingWord;
  if (!word) return;

  let collection;
  if (select.value === '__new__') {
    const nameInput = document.getElementById('new-collection-name');
    const name = nameInput.value.trim();
    if (!name) { document.getElementById('new-collection-error').hidden = false; return; }
    collection = { id: uid('col'), name, createdAt: Date.now(), words: [] };
    state.vocabCollections.unshift(collection);
  } else {
    collection = state.vocabCollections.find(c => c.id === select.value);
  }
  if (!collection) return;

  collection.words.push({ id: uid('w'), createdAt: Date.now(), ...word });
  state.lastUsedCollectionId = collection.id;
  autoHighlightForWord(word);
  persist();
  closeAddToCollectionModal();
  renderCollectionsList();
  renderCollectionsDetail();
  renderReadingDetail();
}

function autoHighlightForWord(word) {
  if (!state.autoHighlightOnAdd) return;
  const source = word.source;
  if (!source || source.readingId == null) return;
  const reading = state.readings.find(r => r.id === source.readingId);
  if (!reading) return;
  reading.highlights = reading.highlights || [];
  const alreadyHighlighted = reading.highlights.some(h => h.start === source.start && h.end === source.end);
  if (alreadyHighlighted) return;
  reading.highlights.push({
    id: uid('hl'),
    start: source.start,
    end: source.end,
    text: word.term,
    color: state.defaultHighlightColor,
    createdAt: Date.now(),
  });
}

// ============================================================================
// Vocabulary Collections
// ============================================================================
function currentCollection() {
  return state.vocabCollections.find(c => c.id === state.currentCollectionId) || null;
}
function openCollection(id) {
  state.currentCollectionId = id;
  renderCollectionsList();
  renderCollectionsDetail();
}
function backToCollectionsList() {
  state.currentCollectionId = null;
  renderCollectionsList();
  renderCollectionsDetail();
}
function deleteCollection(id) {
  if (!window.confirm('Delete this collection?')) return;
  state.vocabCollections = state.vocabCollections.filter(c => c.id !== id);
  if (state.currentCollectionId === id) state.currentCollectionId = null;
  renderCollectionsList();
  renderCollectionsDetail();
  persist();
}
function deleteWordFromCollection(collectionId, wordId) {
  const c = state.vocabCollections.find(x => x.id === collectionId);
  if (!c) return;
  c.words = c.words.filter(w => w.id !== wordId);
  persist();
  renderCollectionsList();
  renderCollectionsDetail();
  const reading = currentReading();
  if (reading) renderReadingVocabSidebar(reading);
}
function jumpToReadingSource(source) {
  const reading = state.readings.find(r => r.id === source.readingId);
  if (!reading) { window.alert('The original reading no longer exists.'); return; }
  state.section = 'reading';
  state.currentReadingId = reading.id;
  renderNav();
  renderReadingList();
  renderReadingDetail({ start: source.start, end: source.end });
}

function renderCollectionsList() {
  const tbody = document.getElementById('collections-tbody');
  tbody.innerHTML = '';
  for (const c of state.vocabCollections) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="row-title"><a href="#">${escapeHtml(c.name)}</a></div></td>
      <td class="col-num">${c.words.length}</td>
      <td class="col-num">${timeAgo(c.createdAt)}</td>
      <td class="col-icon">
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    `;
    tr.querySelector('.row-title a').addEventListener('click', (e) => { e.preventDefault(); openCollection(c.id); });
    tr.querySelector('.btn-icon').addEventListener('click', (e) => { e.stopPropagation(); deleteCollection(c.id); });
    tbody.appendChild(tr);
  }
}
function renderCollectionsDetail() {
  const c = currentCollection();
  document.getElementById('collections-view-list').hidden = !!c;
  document.getElementById('collections-view-detail').hidden = !c;
  if (!c) return;

  document.getElementById('collection-detail-title').textContent = c.name;
  const tbody = document.getElementById('collection-words-tbody');
  tbody.innerHTML = '';
  for (const w of c.words) {
    const tr = document.createElement('tr');
    const sourceLabel = (w.source && w.source.readingTitle) || '—';
    tr.innerHTML = `
      <td><b>${escapeHtml(w.term || '')}</b></td>
      <td>${escapeHtml(w.meaning || '—')}</td>
      <td>${escapeHtml(w.ipa || '—')}</td>
      <td>${escapeHtml(w.pos || '—')}</td>
      <td class="source-excerpt" title="${escapeHtml((w.source && w.source.excerpt) || '')}">${escapeHtml(sourceLabel)}</td>
      <td class="col-icon">
        <button type="button" class="btn btn-ghost btn-icon btn-pron-word" aria-label="Pronunciation Practice" title="Pronunciation Practice"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
        <button type="button" class="btn btn-ghost btn-icon btn-delete-word" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    `;
    if (w.source && w.source.readingId) {
      tr.querySelector('.source-excerpt').addEventListener('click', () => jumpToReadingSource(w.source));
    }
    tr.querySelector('.btn-pron-word').addEventListener('click', () => openPronunciationPractice({ term: w.term, ipa: w.ipa, needsLookup: false }));
    tr.querySelector('.btn-delete-word').addEventListener('click', () => deleteWordFromCollection(c.id, w.id));
    tbody.appendChild(tr);
  }
}

function readingTopicName(topicId) {
  const topic = state.readingTopics.find(t => t.id === topicId);
  return topic ? topic.name : '';
}
function populateReadingTopicFilter() {
  const select = document.getElementById('reading-topic-filter');
  if (!select) return;
  const current = state.readingTopicFilter;
  select.innerHTML = '<option value="">All topics</option>';
  for (const t of state.readingTopics) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  }
  select.value = current && state.readingTopics.some(t => t.id === current) ? current : '';
  state.readingTopicFilter = select.value;
}
function renderReadingList() {
  populateReadingTopicFilter();
  const tbody = document.getElementById('reading-tbody');
  tbody.innerHTML = '';
  const filtered = state.readingTopicFilter
    ? state.readings.filter(r => r.topicId === state.readingTopicFilter)
    : state.readings;
  for (const r of filtered) {
    const topicName = readingTopicName(r.topicId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="row-title"><a href="#">${escapeHtml(r.title)}</a></div></td>
      <td class="col-num">${topicName ? escapeHtml(topicName) : '<span class="col-empty">—</span>'}</td>
      <td class="col-num">${r.type === 'pdf' ? 'PDF' : 'Markdown'} · ${r.source === 'upload' ? 'Uploaded' : 'Created'}</td>
      <td class="col-num">${(r.highlights || []).length}</td>
      <td class="col-num">${timeAgo(r.createdAt)}</td>
      <td class="col-icon">
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    `;
    tr.querySelector('.row-title a').addEventListener('click', (e) => { e.preventDefault(); openReading(r.id); });
    const [editBtn, deleteBtn] = tr.querySelectorAll('.col-icon .btn-icon');
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openReadingEditModal(r); });
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteReading(r.id); });
    tbody.appendChild(tr);
  }
}
let readingRenderVersion = 0;
async function renderReadingDetail(focusRange) {
  const version = ++readingRenderVersion;
  const reading = currentReading();
  document.getElementById('reading-view-list').hidden = !!reading;
  document.getElementById('reading-view-detail').hidden = !reading;
  if (!reading) return;

  document.getElementById('reading-detail-title').textContent = reading.title;
  const wordCount = (reading.body || '').trim() ? reading.body.trim().split(/\s+/).length : 0;
  document.getElementById('reading-detail-sub').textContent = `${wordCount} words · ${(reading.highlights || []).length} highlights`;

  const preview = document.getElementById('reading-preview');
  document.getElementById('btn-download-md').hidden = reading.type === 'pdf';
  preview.setAttribute('aria-busy', 'false');
  preview.classList.toggle('pdf-preview', reading.type === 'pdf');
  document.querySelectorAll('.pdf-notice').forEach(el => el.remove());
  if (reading.type === 'pdf') {
    if (preview.dataset.pdfId !== String(reading.id)) {
      preview.textContent = 'Opening PDF…';
      preview.setAttribute('aria-busy', 'true');
      delete preview.dataset.pdfId;
      try {
        const pages = await window.renderPdfReading(reading.pdfData);
        if (version !== readingRenderVersion) return;
        preview.replaceChildren(pages);
        preview.setAttribute('aria-busy', 'false');
        preview.dataset.pdfId = String(reading.id);
      } catch (err) {
        if (version !== readingRenderVersion) return;
        preview.textContent = 'Unable to open PDF: ' + err.message;
        return;
      }
    } else {
      preview.querySelectorAll('mark').forEach(mark => mark.replaceWith(...mark.childNodes));
      preview.normalize();
    }
    const text = preview.textContent;
    document.getElementById('reading-detail-sub').textContent = `PDF · ${text.trim() ? text.trim().split(/\s+/).length : 0} words · ${(reading.highlights || []).length} highlights`;
    if (!text.trim()) {
      const notice = document.createElement('div');
      notice.className = 'pdf-notice';
      notice.textContent = 'This PDF has no text layer. OCR is needed to select text in scanned pages.';
      preview.before(notice);
    }
  } else {
    delete preview.dataset.pdfId;
    preview.innerHTML = renderMarkdown(reading.body);
  }
  applyHighlightsToContainer(preview, reading.highlights || []);
  const recordingRanges = new Map();
  for (const saved of reading.pronunciationRecordings || []) {
    // Avoid attaching old recordings to unrelated text after a Markdown edit.
    if (preview.textContent.slice(saved.start, saved.end).trim() === saved.text.trim()) recordingRanges.set(`${saved.start}:${saved.end}`, saved);
  }
  applyHighlightsToContainer(preview, [...recordingRanges.values()], 'pron-recording');
  preview.querySelectorAll('mark.pron-recording').forEach(mark => {
    mark.title = 'Open saved pronunciation recordings';
    mark.setAttribute('role', 'button');
    mark.tabIndex = 0;
    mark.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mark.click(); }
    });
  });

  if (focusRange) {
    applyHighlightsToContainer(preview, [{ id: 'jump-temp', start: focusRange.start, end: focusRange.end, color: 'rgba(255,196,0,0.65)' }]);
    const mark = preview.querySelector('mark[data-hl-id="jump-temp"]');
    if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (state.readingSearchMatches.length) {
    const marks = state.readingSearchMatches.map((m, idx) => ({ id: `search-${idx}`, start: m.start, end: m.end }));
    applyHighlightsToContainer(preview, marks, 'search-hl');
    const currentMark = preview.querySelector(`mark[data-hl-id="search-${state.readingSearchIndex}"]`);
    if (currentMark) currentMark.classList.add('current-match');
  }

  renderHighlightsSidebar(reading);
  renderReadingVocabSidebar(reading);
  updateHighlightsCardStickyOffset();
}

// The highlights sidebar and the reading header are both position:sticky,
// stacked on top of each other. The header's height changes (search bar
// toggled, title wraps, window resized), so the card's sticky offset has to
// be recomputed to sit right below it instead of a fixed guess that could
// leave it overlapped/hidden behind the header.
function updateHighlightsCardStickyOffset() {
  const header = document.querySelector('.reading-detail-header');
  const card = document.querySelector('.highlights-card');
  if (!header || !card || document.getElementById('reading-view-detail').hidden) return;
  const gap = 16;
  const headerHeight = header.getBoundingClientRect().height;
  card.style.top = `${headerHeight + gap}px`;
  card.style.maxHeight = `calc(100vh - ${headerHeight + gap}px - ${gap}px)`;
}

// ---- Read Aloud: read the whole reading out loud, highlighting the word
// currently being spoken, with pause/resume and a speed control. Uses live
// Audio/SpeechSynthesis objects, so it's kept as a plain module variable
// rather than inside the persisted `state` object (mirrors `currentPiperAudio`).
//
// Piper has no streaming mode — it only returns a finished WAV file — so
// synthesizing the whole remaining reading in one call meant a long wait
// before anything played. Instead we split the text into small sentence-size
// chunks and pipeline them: while chunk N is playing, chunk N+1 is already
// being synthesized in the background (`prefetch`), so playback moves from
// one chunk to the next with no re-triggered wait.
let readAloudState = null; // { words, text, chunks, cursor, chunkIdx, status, provider, audio, prefetch }

function computeReadAloudWords(text) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return words;
}

// Splits into sentence-ish runs (ending in . ! ? or a line break). Very short
// runs (abbreviations like "Mr.", stray fragments) get merged into the next
// one so each Piper call is worth its fixed process-spawn overhead.
function computeReadAloudChunks(text) {
  const MIN_CHUNK_LEN = 50;
  const re = /[^.!?\n]*[.!?\n]+/g;
  const raw = [];
  let m, lastEnd = 0;
  while ((m = re.exec(text))) {
    if (!m[0].length) { re.lastIndex++; continue; }
    raw.push({ start: m.index, end: m.index + m[0].length });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) raw.push({ start: lastEnd, end: text.length });

  const chunks = [];
  for (const c of raw) {
    if (!text.slice(c.start, c.end).trim()) continue;
    const prev = chunks[chunks.length - 1];
    if (prev && (prev.end - prev.start) < MIN_CHUNK_LEN) prev.end = c.end;
    else chunks.push({ start: c.start, end: c.end });
  }
  return chunks.length ? chunks : [{ start: 0, end: text.length }];
}
function findWordIndexAtOffset(words, offset) {
  const idx = words.findIndex(w => w.end > offset);
  return idx === -1 ? words.length - 1 : idx;
}

function clearReadAloudHighlight() {
  const preview = document.getElementById('reading-preview');
  if (!preview) return;
  // Remove every leftover mark, not just the first — a stale utterance whose
  // events fired after a newer one started (see the session guard below)
  // could otherwise leave old marks stuck on screen forever.
  for (const mark of preview.querySelectorAll('mark.read-hl')) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}
function setReadAloudHighlightedWord(word) {
  const preview = document.getElementById('reading-preview');
  if (!preview || !word) return;
  clearReadAloudHighlight();
  applyHighlightsToContainer(preview, [{ id: 'read-cursor', start: word.start, end: word.end }], 'read-hl');
  const mark = preview.querySelector('mark.read-hl');
  if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
// `rs` is the session object the caller's listener was set up for — every
// caller must pass it so a stale/overlapping utterance (Chromium's
// speechSynthesis.cancel() does not always stop a previous utterance's
// events immediately) can never touch a newer session's highlight or cursor.
function highlightWordAtAbsoluteCharIndex(rs, absIdx) {
  if (readAloudState !== rs) return;
  const words = rs.words;
  while (rs.cursor < words.length - 1 && words[rs.cursor].end <= absIdx) rs.cursor++;
  setReadAloudHighlightedWord(words[rs.cursor]);
}

function renderReadAloudBar() {
  const bar = document.getElementById('read-aloud-bar');
  if (!bar) return;
  const active = !!readAloudState;
  bar.hidden = !active;
  document.getElementById('btn-read-aloud').classList.toggle('active', active);
  if (!active) return;
  const playing = readAloudState.status === 'playing';
  const toggleBtn = document.getElementById('btn-read-aloud-pause');
  toggleBtn.innerHTML = playing
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l14 9-14 9V3z"/></svg>';
  toggleBtn.title = playing ? 'Pause' : 'Resume';
  document.getElementById('read-aloud-rate').value = state.speechRate;
  document.getElementById('read-aloud-rate-value').textContent = `${state.speechRate.toFixed(1)}x`;
}

function startReadAloudSystemFrom(startIndex) {
  if (!window.speechSynthesis) {
    readAloudState = null;
    window.alert('System speech is not supported, and Piper is not configured.');
    renderReadAloudBar();
    return;
  }
  window.speechSynthesis.cancel();
  const rs = readAloudState;
  const words = rs.words;
  const baseOffset = words[startIndex].start;
  const utter = new SpeechSynthesisUtterance(rs.text.slice(baseOffset));
  utter.lang = 'en-US';
  utter.rate = state.speechRate;
  utter.addEventListener('boundary', (e) => {
    if (e.name && e.name !== 'word') return;
    highlightWordAtAbsoluteCharIndex(rs, baseOffset + e.charIndex);
  });
  utter.addEventListener('end', () => { if (readAloudState === rs) stopReadAloud(); });
  window.speechSynthesis.speak(utter);
}

async function synthesizeChunkAudioUrl(text, rate) {
  const result = await window.api.piperSpeak({
    piperPath: state.piperConfig.piperPath, modelPath: state.piperConfig.modelPath, text, rate,
  });
  if (!result || result.error || !result.audioBase64) throw new Error((result && result.error) || 'Piper failed');
  const bytes = Uint8Array.from(atob(result.audioBase64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}
// Memoized per read-aloud session so a chunk is only ever synthesized once,
// and can be kicked off ahead of time (for the chunk after the one playing).
function ensureChunkPrefetched(rs, idx) {
  if (readAloudState !== rs || idx < 0 || idx >= rs.chunks.length || rs.prefetch.has(idx)) return;
  const chunkText = rs.text.slice(rs.chunks[idx].start, rs.chunks[idx].end);
  rs.prefetch.set(idx, synthesizeChunkAudioUrl(chunkText, state.speechRate));
}
async function playReadAloudChunk(rs, idx) {
  if (readAloudState !== rs) return;
  if (idx >= rs.chunks.length) { stopReadAloud(); return; }
  rs.chunkIdx = idx;
  ensureChunkPrefetched(rs, idx);
  ensureChunkPrefetched(rs, idx + 1); // starts synthesizing the next chunk right away, in parallel with this one playing

  let blobUrl;
  try {
    blobUrl = await rs.prefetch.get(idx);
  } catch (err) {
    if (readAloudState !== rs) return;
    rs.provider = 'system'; // Piper failed for this chunk — fall back for the rest of the reading
    startReadAloudSystemFrom(findWordIndexAtOffset(rs.words, rs.chunks[idx].start));
    return;
  }
  if (readAloudState !== rs) return; // stopped/rate-changed while this chunk was synthesizing

  const audio = new Audio(blobUrl);
  rs.audio = audio;
  const baseOffset = rs.chunks[idx].start;
  const totalChars = (rs.chunks[idx].end - rs.chunks[idx].start) || 1;
  audio.addEventListener('timeupdate', () => {
    if (readAloudState !== rs || rs.audio !== audio || !audio.duration) return;
    const frac = Math.min(1, audio.currentTime / audio.duration);
    highlightWordAtAbsoluteCharIndex(rs, baseOffset + Math.floor(frac * totalChars));
  });
  audio.addEventListener('ended', () => {
    if (readAloudState !== rs || rs.audio !== audio) return;
    playReadAloudChunk(rs, idx + 1);
  });
  if (rs.status === 'playing') audio.play();
}

function startReadAloudSession(words, text, chunks, startWordIndex) {
  readAloudState = {
    words, text, chunks, cursor: startWordIndex, chunkIdx: 0,
    status: 'playing', provider: isPiperConfigured() ? 'piper' : 'system',
    audio: null, prefetch: new Map(),
  };
  renderReadAloudBar();
  if (readAloudState.provider === 'piper') {
    const startChunk = Math.max(0, chunks.findIndex(c => c.end > words[startWordIndex].start));
    playReadAloudChunk(readAloudState, startChunk);
  } else {
    startReadAloudSystemFrom(startWordIndex);
  }
}

function startReadAloud() {
  if (document.getElementById('reading-preview').getAttribute('aria-busy') === 'true') return;
  const reading = currentReading();
  if (!reading) return;
  stopReadAloud();
  const preview = document.getElementById('reading-preview');
  const text = preview.textContent || '';
  const words = computeReadAloudWords(text);
  if (!words.length) return;
  const chunks = computeReadAloudChunks(text);
  document.getElementById('read-aloud-bar').hidden = false;
  updateHighlightsCardStickyOffset();
  startReadAloudSession(words, text, chunks, 0);
}
function toggleReadAloud() {
  if (readAloudState) { stopReadAloud(); return; }
  startReadAloud();
}
function toggleReadAloudPause() {
  if (!readAloudState) return;
  if (readAloudState.status === 'playing') {
    if (readAloudState.provider === 'piper') readAloudState.audio?.pause();
    else window.speechSynthesis.pause();
    readAloudState.status = 'paused';
  } else {
    if (readAloudState.provider === 'piper') readAloudState.audio?.play();
    else window.speechSynthesis.resume();
    readAloudState.status = 'playing';
  }
  renderReadAloudBar();
}
function revokeChunkPrefetch(rs) {
  if (!rs || !rs.prefetch) return;
  for (const p of rs.prefetch.values()) p.then((url) => URL.revokeObjectURL(url)).catch(() => {});
}
function stopReadAloud() {
  if (readAloudState) {
    if (readAloudState.audio) readAloudState.audio.pause();
    if (readAloudState.provider === 'system' && window.speechSynthesis) window.speechSynthesis.cancel();
    revokeChunkPrefetch(readAloudState);
  }
  readAloudState = null;
  clearReadAloudHighlight();
  const bar = document.getElementById('read-aloud-bar');
  if (bar) bar.hidden = true;
  const btn = document.getElementById('btn-read-aloud');
  if (btn) btn.classList.remove('active');
  updateHighlightsCardStickyOffset();
}
function onReadAloudRateInput(rate) {
  state.speechRate = rate;
  document.getElementById('read-aloud-rate-value').textContent = `${rate.toFixed(1)}x`;
}
function onReadAloudRateChange() {
  persist();
  if (readAloudState) {
    const rs = readAloudState;
    const { cursor, words, text, chunks } = rs;
    if (rs.audio) rs.audio.pause();
    if (rs.provider === 'system' && window.speechSynthesis) window.speechSynthesis.cancel();
    readAloudState = null; // invalidate rs so any in-flight prefetch/timeupdate callbacks become no-ops
    revokeChunkPrefetch(rs);
    startReadAloudSession(words, text, chunks, cursor);
  }
}

// ---- In-reading search (separate from user highlights) ----
function computeSearchMatches(text, query) {
  const matches = [];
  if (!query) return matches;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let idx = 0;
  while (true) {
    const found = lowerText.indexOf(lowerQuery, idx);
    if (found === -1) break;
    matches.push({ start: found, end: found + query.length });
    idx = found + query.length;
  }
  return matches;
}
function updateReadingSearchCount() {
  const el = document.getElementById('reading-search-count');
  if (!el) return;
  const total = state.readingSearchMatches.length;
  const current = total ? state.readingSearchIndex + 1 : 0;
  el.textContent = `${current}/${total}`;
}
function scrollToCurrentSearchMatch() {
  const preview = document.getElementById('reading-preview');
  const mark = preview && preview.querySelector('mark.search-hl.current-match');
  if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function runReadingSearch(query) {
  if (document.getElementById('reading-preview').getAttribute('aria-busy') === 'true') return;
  state.readingSearchQuery = query;
  const preview = document.getElementById('reading-preview');
  const text = preview ? preview.textContent || '' : '';
  state.readingSearchMatches = computeSearchMatches(text, query.trim());
  state.readingSearchIndex = state.readingSearchMatches.length ? 0 : -1;
  renderReadingDetail();
  updateReadingSearchCount();
  scrollToCurrentSearchMatch();
}
function gotoSearchMatch(delta) {
  const total = state.readingSearchMatches.length;
  if (!total) return;
  state.readingSearchIndex = ((state.readingSearchIndex + delta) % total + total) % total;
  renderReadingDetail();
  updateReadingSearchCount();
  scrollToCurrentSearchMatch();
}
function openReadingSearch() {
  state.readingSearchOpen = true;
  document.getElementById('reading-search-bar').hidden = false;
  document.getElementById('reading-search-input').focus();
  updateHighlightsCardStickyOffset();
}
function closeReadingSearch() {
  resetReadingSearchUI();
  updateReadingSearchCount();
  renderReadingDetail();
}

function renderHighlightsSidebar(reading) {
  const list = document.getElementById('reading-highlights-list');
  if (!list) return;
  const highlights = (reading && reading.highlights) || [];
  if (!highlights.length) {
    list.innerHTML = '<div class="highlight-empty">No highlights yet. Select text in the reading to highlight it.</div>';
    return;
  }
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  list.innerHTML = '';
  for (const h of sorted) {
    const item = document.createElement('div');
    item.className = 'highlight-item';
    item.innerHTML = `
      <button type="button" class="highlight-swatch" style="background:${h.color}" aria-label="Jump to highlight"></button>
      <button type="button" class="highlight-text">${escapeHtml(h.text)}</button>
      <button type="button" class="btn btn-ghost btn-icon highlight-remove" aria-label="Remove highlight"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
    `;
    item.querySelector('.highlight-swatch').addEventListener('click', () => focusHighlight(h.id));
    item.querySelector('.highlight-text').addEventListener('click', () => focusHighlight(h.id));
    item.querySelector('.highlight-remove').addEventListener('click', () => removeHighlight(h.id));
    list.appendChild(item);
  }
}

// Words saved into any collection whose source points back at this reading,
// sorted by where they occur in the text (same ordering as Highlights).
function readingVocabItems(reading) {
  const items = [];
  for (const c of state.vocabCollections) {
    for (const w of c.words) {
      if (w.source && w.source.readingId === reading.id) items.push({ word: w, collection: c });
    }
  }
  return items.sort((a, b) => (a.word.source.start || 0) - (b.word.source.start || 0));
}

function renderReadingVocabSidebar(reading) {
  closeVocabActionsMenu();
  const list = document.getElementById('reading-vocab-list');
  if (!list) return;
  const items = readingVocabItems(reading);
  if (!items.length) {
    list.innerHTML = '<div class="highlight-empty">No vocabulary added from this reading yet.</div>';
    return;
  }
  const speakerIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.72"/></svg>';
  const micIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  const trashIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

  list.innerHTML = '';
  for (const { word: w, collection: c } of items) {
    const item = document.createElement('div');
    item.className = 'highlight-item vocab-item';
    item.innerHTML = `
      <button type="button" class="highlight-text" title="View details · Collection: ${escapeHtml(c.name)}"><span>${escapeHtml(w.term)}</span><span class="vocab-item-ipa" title="${escapeHtml(w.ipa ? `IPA: ${w.ipa}` : 'IPA not available')}">${escapeHtml(w.ipa || 'IPA not available')}</span></button>
      <span class="vocab-item-actions">
        <button type="button" class="btn btn-ghost btn-icon vocab-speak" aria-label="Play pronunciation" title="Play pronunciation">${speakerIcon}</button>
        <button type="button" class="btn btn-ghost btn-icon vocab-delete" aria-label="Delete from collection" title="Delete from collection">${trashIcon}</button>
        <button type="button" class="btn btn-ghost btn-icon vocab-more" aria-label="More actions" title="More actions" aria-haspopup="menu" aria-expanded="false"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
      </span>
    `;
    item.querySelector('.highlight-text').addEventListener('click', () => openVocabItemModal(c.id, w.id));
    item.querySelector('.vocab-speak').addEventListener('click', (e) => { e.stopPropagation(); speak(w.term, state.speechRate); });
    item.querySelector('.vocab-more').addEventListener('click', (e) => { e.stopPropagation(); openVocabActionsMenu(e.currentTarget, c, w); });
    item.querySelector('.vocab-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteWordFromCollection(c.id, w.id); });
    list.appendChild(item);
  }
}

let vocabActionsMenu = null;
function closeVocabActionsMenu(restoreFocus = false) {
  if (!vocabActionsMenu) return;
  const { menu, trigger, cleanup } = vocabActionsMenu;
  cleanup();
  menu.remove();
  trigger.setAttribute('aria-expanded', 'false');
  vocabActionsMenu = null;
  if (restoreFocus && trigger.isConnected) trigger.focus();
}

function openVocabActionsMenu(trigger, collection, word) {
  const wasOpen = vocabActionsMenu && vocabActionsMenu.trigger === trigger;
  closeVocabActionsMenu();
  if (wasOpen) return;
  const menu = document.createElement('div');
  menu.className = 'vocab-actions-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', `Actions for ${word.term}`);
  const actions = [
    ['Edit collection', () => openVocabCollectionEditor(collection.id, word.id)],
    ['Practice pronunciation', () => openPronunciationPractice({ term: word.term, ipa: word.ipa, needsLookup: false })],
  ];
  for (const [label, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.textContent = label;
    button.title = label === 'Edit collection' ? 'Change the collection where this word is saved' : 'Record and score your pronunciation';
    button.addEventListener('click', () => { closeVocabActionsMenu(true); action(); });
    menu.appendChild(button);
  }
  document.body.appendChild(menu);
  const rect = trigger.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${Math.max(8, rect.bottom + menu.offsetHeight + 8 > window.innerHeight ? rect.top - menu.offsetHeight - 4 : rect.bottom + 4)}px`;
  const onOutside = (e) => { if (!menu.contains(e.target) && !trigger.contains(e.target)) closeVocabActionsMenu(); };
  const onMove = () => closeVocabActionsMenu();
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeVocabActionsMenu(true); }
    else if (e.key === 'Tab') closeVocabActionsMenu(true);
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const buttons = [...menu.querySelectorAll('button')];
      const index = buttons.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    }
  };
  document.addEventListener('pointerdown', onOutside);
  menu.addEventListener('keydown', onKey);
  window.addEventListener('resize', onMove);
  window.addEventListener('scroll', onMove, true);
  vocabActionsMenu = { menu, trigger, cleanup: () => {
    document.removeEventListener('pointerdown', onOutside);
    window.removeEventListener('resize', onMove);
    window.removeEventListener('scroll', onMove, true);
  } };
  trigger.setAttribute('aria-expanded', 'true');
  menu.querySelector('button').focus();
}

function openVocabCollectionEditor(collectionId, wordId) {
  const source = state.vocabCollections.find(c => c.id === collectionId);
  const word = source && source.words.find(w => w.id === wordId);
  if (!word) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog vocab-collection-editor';
  dialog.setAttribute('aria-labelledby', 'vocab-edit-title');
  dialog.innerHTML = `
    <form>
      <h2 class="dialog-title" id="vocab-edit-title">Edit collection</h2>
      <div class="dialog-body">
        <p>${escapeHtml(word.term)} ${escapeHtml(word.ipa || '')}</p>
        <label class="field">Collection<select class="input" name="collection" aria-label="Collection" title="Choose a collection for this word"></select></label>
      </div>
      <div class="dialog-actions"><button type="button" class="btn btn-secondary" title="Discard changes" data-cancel>Cancel</button><button type="submit" class="btn btn-primary" title="Save collection changes">Save</button></div>
    </form>`;
  const select = dialog.querySelector('select');
  for (const c of state.vocabCollections) select.add(new Option(c.name, c.id));
  select.value = collectionId;
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = state.vocabCollections.find(c => c.id === select.value);
    if (!target) return;
    if (target !== source) {
      source.words = source.words.filter(w => w.id !== wordId);
      target.words.push(word);
      persist();
      renderCollectionsList();
      renderCollectionsDetail();
      const reading = currentReading();
      if (reading) renderReadingVocabSidebar(reading);
    }
    dialog.close();
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  select.focus();
}

function openVocabItemModal(collectionId, wordId) {
  const c = state.vocabCollections.find(x => x.id === collectionId);
  const w = c && c.words.find(x => x.id === wordId);
  if (!w) return;
  const speakerIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.72"/></svg>';

  document.getElementById('vocab-item-title').textContent = w.term;
  document.getElementById('vocab-item-body').innerHTML = `
    <div class="translate-source-tag">${escapeHtml(c.name)}</div>
    <div class="lookup-term-row">
      <span class="lookup-term">${escapeHtml(w.term)}</span>
      ${w.ipa ? `<span class="lookup-ipa">${escapeHtml(w.ipa)}</span>` : ''}
      <button type="button" class="btn btn-ghost btn-icon" id="btn-vocab-item-speak" aria-label="Play pronunciation" title="Play pronunciation">${speakerIcon}</button>
    </div>
    ${w.pos ? `<div class="lookup-pos">${escapeHtml(w.pos)}</div>` : ''}
    ${w.meaning ? `<div style="margin-bottom: var(--space-3);">${escapeHtml(w.meaning)}</div>` : ''}
    ${w.example ? `<div class="lookup-example">"${escapeHtml(w.example)}"${w.exampleTranslation ? ` — ${escapeHtml(w.exampleTranslation)}` : ''}</div>` : ''}
    ${w.source && w.source.excerpt ? `<div class="lookup-example">Reading excerpt: "${escapeHtml(w.source.excerpt)}"</div>` : ''}
  `;
  document.getElementById('btn-vocab-item-speak').addEventListener('click', () => speak(w.term, state.speechRate));
  document.getElementById('vocab-item-backdrop').hidden = false;
}
function closeVocabItemModal() {
  document.getElementById('vocab-item-backdrop').hidden = true;
}

function focusHighlight(hlId) {
  const preview = document.getElementById('reading-preview');
  if (!preview) return;
  const mark = preview.querySelector(`mark[data-hl-id="${hlId}"]`);
  if (!mark) return;
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  mark.classList.add('hl-focus');
  setTimeout(() => mark.classList.remove('hl-focus'), 1200);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeFilename(name) {
  return (name || 'reading').replace(/[\\/:*?"<>|]/g, '-').trim() || 'reading';
}

async function downloadReadingMarkdown() {
  const reading = currentReading();
  if (!reading) return;
  const result = await window.api.saveMarkdownFile({
    defaultName: `${sanitizeFilename(reading.title)}.md`,
    content: reading.body,
  });
  if (result && result.error) window.alert(result.error);
}

async function downloadReadingPdf() {
  const reading = currentReading();
  if (!reading) return;
  if (state.readingSearchOpen) closeReadingSearch(); // don't leak the orange search highlight into the export
  const btn = document.getElementById('btn-download-pdf');
  btn.disabled = true;
  try {
    const result = await window.api.saveReadingAsPdf({ defaultName: `${sanitizeFilename(reading.title)}.pdf`, ...(reading.type === 'pdf' ? { pdfData: reading.pdfData } : {}) });
    if (result && result.error) window.alert(result.error);
  } finally {
    btn.disabled = false;
  }
}

// Renders a vocabulary table into the normally-invisible #vocab-pdf-export
// container, then reuses the exact same generic "print current window to
// PDF" IPC call as downloadReadingPdf — no main.js changes needed, since
// that handler just calls webContents.printToPDF() on whatever is on
// screen. The @media print rules for body.exporting-vocab-pdf (styles.css)
// hide everything else and show only this table for that one print pass.
async function exportVocabularyPdf(items, title, triggerBtn) {
  if (!items.length) { window.alert('No vocabulary to export.'); return; }
  if (triggerBtn) triggerBtn.disabled = true;
  try {
    const rows = items.map(({ word: w }) => `
      <tr>
        <td>${escapeHtml(w.term || '')}</td>
        <td>${escapeHtml(w.ipa || '')}</td>
        <td>${escapeHtml(w.pos || '')}</td>
        <td>${escapeHtml(w.meaning || '')}</td>
        <td>${escapeHtml(w.example || '')}${w.example && w.exampleTranslation ? `<br><i>${escapeHtml(w.exampleTranslation)}</i>` : ''}</td>
      </tr>
    `).join('');
    document.getElementById('vocab-pdf-export').innerHTML = `
      <h1>${escapeHtml(title)}</h1>
      <table>
        <thead><tr><th>Word</th><th>IPA</th><th>Part of Speech</th><th>Meaning</th><th>Example</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    document.body.classList.add('exporting-vocab-pdf');
    const result = await window.api.saveReadingAsPdf({ defaultName: `${sanitizeFilename(title)}.pdf` });
    document.body.classList.remove('exporting-vocab-pdf');
    document.getElementById('vocab-pdf-export').innerHTML = '';
    if (result && result.error) window.alert(result.error);
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}
function exportCollectionVocabularyPdf() {
  const c = currentCollection();
  if (!c) return;
  exportVocabularyPdf(c.words.map(w => ({ word: w })), c.name, document.getElementById('btn-collection-export-pdf'));
}
function exportReadingVocabularyPdf() {
  const reading = currentReading();
  if (!reading) return;
  exportVocabularyPdf(readingVocabItems(reading), reading.title, document.getElementById('btn-reading-vocab-export-pdf'));
}

function renderAll() {
  renderNav();
  renderPostsList();
  renderDetail();
  renderCorpus();
  renderReadingList();
  renderReadingDetail();
  renderCollectionsList();
  renderCollectionsDetail();
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

// ---- Reading Practice ----
document.getElementById('nav-reading').addEventListener('click', goToReading);
document.getElementById('nav-collections').addEventListener('click', goToCollections);
document.getElementById('btn-open-llm-config').addEventListener('click', openLlmConfigModal);

document.getElementById('btn-upload-reading').addEventListener('click', handleUploadReading);
document.getElementById('btn-new-reading').addEventListener('click', openReadingAddModal);
document.getElementById('btn-reading-back').addEventListener('click', backToReadingList);
document.getElementById('btn-edit-reading').addEventListener('click', () => {
  const r = currentReading();
  if (r) openReadingEditModal(r);
});

document.getElementById('reading-preview').addEventListener('mouseup', onReadingPreviewMouseUp);
document.getElementById('reading-preview').addEventListener('click', onReadingPreviewClick);

document.getElementById('btn-toggle-search').addEventListener('click', () => {
  if (state.readingSearchOpen) closeReadingSearch(); else openReadingSearch();
});
document.getElementById('btn-download-md').addEventListener('click', downloadReadingMarkdown);
document.getElementById('btn-download-pdf').addEventListener('click', downloadReadingPdf);
document.getElementById('btn-reading-vocab-export-pdf').addEventListener('click', exportReadingVocabularyPdf);
document.getElementById('btn-collection-export-pdf').addEventListener('click', exportCollectionVocabularyPdf);
document.getElementById('btn-search-close').addEventListener('click', closeReadingSearch);
document.getElementById('btn-search-next').addEventListener('click', () => gotoSearchMatch(1));
document.getElementById('btn-search-prev').addEventListener('click', () => gotoSearchMatch(-1));
document.getElementById('reading-search-input').addEventListener('input', (e) => runReadingSearch(e.target.value));
document.getElementById('reading-search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); gotoSearchMatch(e.shiftKey ? -1 : 1); }
  else if (e.key === 'Escape') { e.preventDefault(); closeReadingSearch(); }
});

// ---- Read Aloud (whole-reading TTS with live word highlighting) ----
document.getElementById('btn-read-aloud').addEventListener('click', toggleReadAloud);
document.getElementById('btn-read-aloud-pause').addEventListener('click', toggleReadAloudPause);
document.getElementById('btn-read-aloud-stop').addEventListener('click', stopReadAloud);
document.getElementById('read-aloud-rate').addEventListener('input', (e) => onReadAloudRateInput(parseFloat(e.target.value)));
document.getElementById('read-aloud-rate').addEventListener('change', onReadAloudRateChange);

document.getElementById('reading-modal-backdrop').addEventListener('click', closeReadingModal);
document.getElementById('reading-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-reading-cancel').addEventListener('click', closeReadingModal);
document.getElementById('btn-reading-save').addEventListener('click', submitReadingModal);
document.getElementById('reading-title-input').addEventListener('input', (e) => {
  state.readingTitle = e.target.value;
  if (!document.getElementById('reading-title-error').hidden) validateReadingModal();
});
document.getElementById('reading-text-input').addEventListener('input', (e) => {
  state.readingText = e.target.value;
  if (!document.getElementById('reading-text-error').hidden) validateReadingModal();
});
document.querySelectorAll('input[name="readingMdView"]').forEach(r => r.addEventListener('change', (e) => { if (e.target.checked) setReadingMdView(e.target.value); }));

document.getElementById('reading-topic-select').addEventListener('change', (e) => {
  const isNew = e.target.value === '__new__';
  document.getElementById('reading-new-topic-field').hidden = !isNew;
  if (isNew) document.getElementById('reading-new-topic-name').focus();
});
document.getElementById('reading-new-topic-name').addEventListener('input', () => {
  document.getElementById('reading-new-topic-error').hidden = true;
});
document.getElementById('reading-topic-filter').addEventListener('change', (e) => {
  state.readingTopicFilter = e.target.value;
  renderReadingList();
});

// ---- Selection bubble menu (highlight / translate / recolor) ----
document.querySelectorAll('.sel-swatch').forEach(btn => btn.addEventListener('click', () => {
  if (state.editingHighlightId) {
    recolorHighlight(state.editingHighlightId, btn.dataset.color);
  } else {
    addHighlight(btn.dataset.color);
  }
}));
document.getElementById('btn-sel-speak').addEventListener('click', speakSelectionMenuTarget);
document.getElementById('btn-sel-lookup').addEventListener('click', () => {
  const sel = state.pendingSelection;
  if (!sel) return;
  if (sel.source?.lessonId) window.Listening?.stopAudio();
  window.getSelection().removeAllRanges();
  hideSelectionMenu();
  openDictionaryLookup(sel);
});
document.getElementById('btn-sel-translate').addEventListener('click', () => {
  const sel = state.pendingSelection;
  if (!sel) return;
  if (sel.source?.lessonId) window.Listening?.stopAudio();
  window.getSelection().removeAllRanges();
  hideSelectionMenu();
  openTranslate(sel);
});
document.getElementById('btn-sel-pronounce').addEventListener('click', () => {
  const sel = state.pendingSelection;
  if (!sel) return;
  window.getSelection().removeAllRanges();
  hideSelectionMenu();
  openPronunciationPractice({ term: sel.text, needsLookup: true, source: sel.source });
});
document.getElementById('btn-sel-remove').addEventListener('click', () => {
  const hlId = state.editingHighlightId;
  if (!hlId) return;
  hideSelectionMenu();
  removeHighlight(hlId);
});
document.addEventListener('mousedown', (e) => {
  const menu = document.getElementById('selection-menu');
  if (!menu.hidden && !menu.contains(e.target)) hideSelectionMenu();
});

// ---- Default highlight color (Settings) ----
document.querySelectorAll('.default-color-swatch').forEach(btn => btn.addEventListener('click', () => {
  state.defaultHighlightColor = btn.dataset.color;
  renderDefaultColorRow();
  persist();
}));

// ---- LLM Config modal ----
document.getElementById('llm-config-backdrop').addEventListener('click', closeLlmConfigModal);
document.getElementById('llm-config-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-llm-config-cancel').addEventListener('click', closeLlmConfigModal);
document.getElementById('btn-llm-config-save').addEventListener('click', saveLlmConfig);
document.getElementById('btn-llm-test').addEventListener('click', testLlmConnectionFromModal);
document.getElementById('settings-speech-rate').addEventListener('input', (e) => {
  state.speechRate = parseFloat(e.target.value);
  document.getElementById('settings-rate-value').textContent = `${state.speechRate.toFixed(1)}x`;
});
document.getElementById('settings-speech-rate').addEventListener('change', () => persist());
document.getElementById('btn-browse-dictionary').addEventListener('click', browseDictionaryFile);
document.getElementById('btn-choose-custom-dictionary').addEventListener('click', async () => {
  const filePath = await window.api.chooseCustomDictionaryPath();
  if (filePath) document.getElementById('custom-dictionary-path-input').value = filePath;
});
document.querySelectorAll('.settings-nav-item').forEach((btn) => btn.addEventListener('click', () => switchSettingsPane(btn.dataset.pane)));
document.getElementById('btn-browse-piper-exe').addEventListener('click', browsePiperExecutable);
document.getElementById('btn-browse-piper-model').addEventListener('click', browsePiperModel);
document.getElementById('btn-piper-test').addEventListener('click', testPiperFromModal);
document.getElementById('btn-browse-pronunciation-model').addEventListener('click', browsePronunciationModelDir);
document.getElementById('btn-pronunciation-download').addEventListener('click', downloadPronunciationModelFromSettings);

// ---- Pronunciation practice modal ----
document.getElementById('pronunciation-backdrop').addEventListener('click', closePronunciationModal);
document.getElementById('pronunciation-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-pronunciation-close').addEventListener('click', closePronunciationModal);

// ---- Vocabulary item info modal (Reading sidebar) ----
document.getElementById('vocab-item-backdrop').addEventListener('click', closeVocabItemModal);
document.getElementById('vocab-item-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-vocab-item-close').addEventListener('click', closeVocabItemModal);

// ---- Translate result modal ----
document.getElementById('translate-backdrop').addEventListener('click', closeTranslateModal);
document.getElementById('translate-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-translate-close').addEventListener('click', closeTranslateModal);
document.getElementById('btn-add-custom-dict').addEventListener('click', addCurrentTranslateToCustomDictionary);
document.getElementById('btn-translate-add').addEventListener('click', () => {
  const ts = state.translateState;
  if (!ts || ts.status !== 'done') return;
  const reading = ts.selection.source?.lessonId ? null : currentReading();
  state.pendingWord = {
    term: ts.term,
    meaning: ts.meaning,
    ipa: ts.ipa,
    pos: ts.pos,
    example: ts.example,
    exampleTranslation: ts.exampleTranslation,
    source: {
      ...ts.selection.source,
      readingId: reading ? reading.id : null,
      readingTitle: reading ? reading.title : '',
      excerpt: buildExcerpt(ts.selection),
      start: ts.selection.start,
      end: ts.selection.end,
    },
  };
  closeTranslateModal();
  openAddToCollectionModal();
});

// ---- Lookup result modal ----
document.getElementById('lookup-backdrop').addEventListener('click', closeLookupModal);
document.getElementById('lookup-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-lookup-close').addEventListener('click', closeLookupModal);
document.getElementById('btn-lookup-add').addEventListener('click', () => {
  const ls = state.lookupState;
  if (!ls || ls.status !== 'done') return;
  const flat = flattenLookupEntry(ls.entry);
  const reading = ls.selection.source?.lessonId ? null : currentReading();
  state.pendingWord = {
    term: flat.term,
    meaning: flat.meaning,
    ipa: flat.ipa,
    pos: flat.pos,
    example: flat.example,
    exampleTranslation: flat.exampleTranslation,
    source: {
      ...ls.selection.source,
      readingId: reading ? reading.id : null,
      readingTitle: reading ? reading.title : '',
      excerpt: buildExcerpt(ls.selection),
      start: ls.selection.start,
      end: ls.selection.end,
    },
  };
  closeLookupModal();
  openAddToCollectionModal();
});

// ---- Add-to-collection modal ----
document.getElementById('add-to-collection-backdrop').addEventListener('click', closeAddToCollectionModal);
document.getElementById('add-to-collection-dialog').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('btn-add-to-collection-cancel').addEventListener('click', closeAddToCollectionModal);
document.getElementById('btn-add-to-collection-confirm').addEventListener('click', confirmAddToCollection);
document.getElementById('collection-select').addEventListener('change', (e) => {
  const isNew = e.target.value === '__new__';
  document.getElementById('new-collection-field').hidden = !isNew;
  if (isNew) document.getElementById('new-collection-name').focus();
});
document.getElementById('new-collection-name').addEventListener('input', () => {
  document.getElementById('new-collection-error').hidden = true;
});

// ---- Collections ----
document.getElementById('btn-new-collection').addEventListener('click', () => {
  const name = window.prompt('New collection name:');
  if (!name || !name.trim()) return;
  state.vocabCollections.unshift({ id: uid('col'), name: name.trim(), createdAt: Date.now(), words: [] });
  persist();
  renderCollectionsList();
});
document.getElementById('btn-collection-back').addEventListener('click', backToCollectionsList);

window.addEventListener('resize', updateHighlightsCardStickyOffset);

loadPersisted().then(renderAll).catch(err => window.alert('Unable to load Reading data. Your original data has been preserved: ' + err.message));
