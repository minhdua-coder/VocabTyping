const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');

const dataFile = path.join(app.getPath('userData'), 'vocabtyping-data.json');
const recordings = require('./recording-store').createRecordingStore(path.join(app.getPath('userData'), 'pronunciation-recordings'));

async function loadData() {
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.readings) && data.readings.some(r => !r.type)) {
      await fs.copyFile(dataFile, dataFile + '.before-document-types.bak', fsSync.constants.COPYFILE_EXCL).catch(err => { if (err.code !== 'EEXIST') throw err; });
      data.readings = data.readings.map(r => r.type ? r : { ...r, type: 'markdown' });
      await saveData(null, data);
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function saveData(_event, data) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

async function openMarkdownFile() {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Reading (Markdown or PDF)',
    properties: ['openFile'],
    filters: [
      { name: 'Reading documents', extensions: ['md', 'markdown', 'pdf'] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  if (path.extname(filePath).toLowerCase() === '.pdf') {
    const bytes = await fs.readFile(filePath);
    if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Invalid PDF file.');
    return { filename: path.basename(filePath), type: 'pdf', pdfData: bytes.toString('base64'), content: '' };
  }
  const content = await fs.readFile(filePath, 'utf-8');
  return { filename: path.basename(filePath), type: 'markdown', content };
}

async function browseFile(_event, { title, filters, directory } = {}) {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: title || (directory ? 'Select Folder' : 'Select File'),
    properties: [directory ? 'openDirectory' : 'openFile'],
    filters: directory ? undefined : (filters && filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]),
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

async function saveMarkdownFile(_event, { defaultName, content }) {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win, {
    title: 'Save Markdown',
    defaultPath: defaultName || 'reading.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    await fs.writeFile(result.filePath, content || '', 'utf-8');
    return { path: result.filePath };
  } catch (err) {
    return { error: `Unable to save file: ${err.message}` };
  }
}

async function saveReadingAsPdf(_event, { defaultName, pdfData } = {}) {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return { error: 'No window was found.' };

  let pdfBuffer;
  try {
    pdfBuffer = pdfData ? Buffer.from(pdfData, 'base64') : await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'none' },
    });
  } catch (err) {
    return { error: `Unable to create PDF: ${err.message}` };
  }

  const result = await dialog.showSaveDialog(win, {
    title: 'Save PDF',
    defaultPath: defaultName || 'reading.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    await fs.writeFile(result.filePath, pdfBuffer);
    return { path: result.filePath };
  } catch (err) {
    return { error: `Unable to save PDF: ${err.message}` };
  }
}

// ---- Local Anh-Việt dictionary (offline, free, user-supplied file) ----
// Keyed by file path so the main downloaded dictionary and the user's own
// custom dictionary (a separate, smaller, app-managed JSON file) can both
// stay cached at once instead of evicting each other on every lookup.
const dictCacheByPath = new Map();

// Classic StarDict-style plain-text export, widely circulated as a free
// English-Vietnamese dictionary. One entry per block, separated by blank
// lines. Structure preserved (not flattened) so the UI can render it the
// way the source data is actually organized:
//   @word /IPA/
//   *  part of speech           -> starts a new sense group (can repeat)
//   - meaning line(s)           -> one or more definitions per sense
//   =example sentence+ trans.   -> attaches to the definition right above it
//   !idiom or phrase            -> starts an idiom block
//   - meaning of the idiom
function parseAtFormatEntry(block) {
  const lines = block.split(/\r?\n/);
  const header = lines[0].match(/^@\s*(.+?)\s*(\/[^/]*\/)?\s*$/);
  if (!header) return null;
  const term = header[1].trim();
  if (!term) return null;
  const ipa = header[2] ? header[2].trim() : '';

  const senses = [];
  const idioms = [];
  let currentSense = null;
  let currentIdiom = null;
  let currentDef = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('*')) {
      currentSense = { pos: line.replace(/^\*\s*/, '').trim(), definitions: [] };
      senses.push(currentSense);
      currentIdiom = null;
      currentDef = null;
    } else if (line.startsWith('!')) {
      currentIdiom = { phrase: line.replace(/^!\s*/, '').trim(), definitions: [] };
      idioms.push(currentIdiom);
      currentDef = null;
    } else if (line.startsWith('-')) {
      const text = line.replace(/^-\s*/, '').trim();
      if (!text) continue;
      if (currentIdiom) {
        currentIdiom.definitions.push(text);
        currentDef = null;
      } else {
        currentDef = { text, examples: [] };
        if (currentSense) currentSense.definitions.push(currentDef);
      }
    } else if (line.startsWith('=') && currentDef) {
      const m = line.match(/^=\s*(.+?)\s*\+\s*(.*)$/);
      if (m) currentDef.examples.push({ en: m[1].trim(), vi: m[2].trim() });
    }
  }
  if (!senses.length && !idioms.length) return null;
  return { term, ipa, senses, idioms };
}

function parseAtFormatDictionary(raw) {
  const map = new Map();
  const blocks = raw.split(/\r?\n(?=@)/);
  for (const block of blocks) {
    const entry = parseAtFormatEntry(block);
    if (entry) map.set(entry.term.toLowerCase(), entry);
  }
  return map;
}

// Wraps a plain "word -> meaning string" pair (JSON / TSV formats) into the
// same structured shape as the richer @-format, so the renderer only has to
// deal with one entry shape regardless of source dictionary format.
function wrapFlatEntry(term, meaning, extra) {
  const examples = extra && extra.example ? [{ en: extra.example, vi: extra.exampleTranslation || '' }] : [];
  return {
    term,
    ipa: (extra && extra.ipa) || '',
    senses: [{ pos: (extra && extra.pos) || '', definitions: [{ text: meaning, examples }] }],
    idioms: [],
  };
}

function parseDictionary(raw, filePath) {
  raw = raw.replace(/^﻿/, ''); // strip UTF-8 BOM if present
  const map = new Map();
  if (filePath.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      for (const entry of data) {
        const term = String(entry.term || entry.word || '').trim();
        const def = String(entry.definition || entry.meaning || entry.def || '').trim();
        if (term && def) map.set(term.toLowerCase(), wrapFlatEntry(term, def, entry));
      }
    } else if (data && typeof data === 'object') {
      for (const [term, def] of Object.entries(data)) {
        const key = String(term).trim();
        if (key && def) map.set(key.toLowerCase(), wrapFlatEntry(key, String(def).trim()));
      }
    }
  } else if (raw.trimStart().startsWith('@')) {
    return parseAtFormatDictionary(raw);
  } else {
    // Plain text: one entry per line, "word<TAB>meaning" (comma also accepted as fallback)
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let sepIdx = line.indexOf('\t');
      if (sepIdx === -1) sepIdx = line.indexOf(',');
      if (sepIdx === -1) continue;
      const term = line.slice(0, sepIdx).trim();
      const def = line.slice(sepIdx + 1).trim();
      if (term && def) map.set(term.toLowerCase(), wrapFlatEntry(term, def));
    }
  }
  return map;
}

async function loadDictionary(dictPath) {
  if (dictCacheByPath.has(dictPath)) return dictCacheByPath.get(dictPath);
  const raw = await fs.readFile(dictPath, 'utf-8');
  const map = parseDictionary(raw, dictPath);
  dictCacheByPath.set(dictPath, map);
  return map;
}

async function dictLookup(_event, { dictPath, term }) {
  if (!dictPath) return { error: 'No English–Vietnamese dictionary is configured. Choose a file in Settings.' };
  if (!term || !term.trim()) return { error: 'No word to look up.' };
  let map;
  try {
    map = await loadDictionary(dictPath);
  } catch (err) {
    return { error: `Unable to read dictionary file: ${err.message}` };
  }
  const key = term.trim().toLowerCase();
  const entry = map.get(key);
  if (!entry) {
    return { error: `"${term}" was not found in the dictionary (${map.size} entries loaded).` };
  }
  return { entry };
}

// Lets the user pick (or type a new filename to create) a JSON file to hold
// their own custom dictionary — separate from the big downloaded one, so
// re-downloading/replacing that file never wipes out the user's additions.
async function chooseCustomDictionaryPath() {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win, {
    title: 'Choose or create a custom dictionary file',
    defaultPath: 'my-dictionary.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
}

// Upserts one entry (by term) into the user's custom dictionary JSON file —
// an array of {term, meaning, ipa, pos, example, exampleTranslation}. The
// file is created on first write if it doesn't exist yet.
async function addCustomDictionaryEntry(_event, { dictPath, entry }) {
  if (!dictPath) return { error: 'No custom dictionary is configured. Choose a file in Settings.' };
  if (!entry || !entry.term) return { error: 'No word to save.' };

  let list = [];
  try {
    const raw = await fs.readFile(dictPath, 'utf-8');
    const parsed = JSON.parse(raw.replace(/^﻿/, ''));
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    // File doesn't exist yet, is empty, or isn't valid JSON — start fresh.
  }

  const key = String(entry.term).trim().toLowerCase();
  const idx = list.findIndex((e) => String(e.term || '').trim().toLowerCase() === key);
  const record = {
    term: entry.term,
    meaning: entry.meaning || '',
    ipa: entry.ipa || '',
    pos: entry.pos || '',
    example: entry.example || '',
    exampleTranslation: entry.exampleTranslation || '',
    updatedAt: Date.now(),
  };
  if (idx !== -1) list[idx] = record; else list.unshift(record);

  try {
    await fs.mkdir(path.dirname(dictPath), { recursive: true });
    await fs.writeFile(dictPath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    return { error: `Unable to save file: ${err.message}` };
  }
  dictCacheByPath.delete(dictPath); // next lookup must pick up this change
  return { count: list.length };
}

// ---- Google Translate (free, unofficial endpoint — no API key required) ----
async function googleTranslate(_event, { text, targetLang }) {
  if (!text || !text.trim()) return { error: 'No text to translate.' };
  const tl = targetLang || 'vi';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text.trim())}`;
  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    return { error: `Unable to connect to Google Translate: ${err.message}` };
  }
  if (!resp.ok) return { error: `Google Translate returned an error (${resp.status}).` };
  let data;
  try {
    data = await resp.json();
  } catch {
    return { error: 'Unable to read the Google Translate response.' };
  }
  const chunks = data && data[0];
  if (!Array.isArray(chunks)) return { error: 'Google Translate returned an invalid result.' };
  const translation = chunks.map((c) => (Array.isArray(c) ? c[0] : '')).join('');
  if (!translation) return { error: 'Google Translate returned no result.' };
  return { translation };
}

// ---- Pronunciation scoring (offline phoneme recognition, no Python) ----
// Runs a community ONNX export of vitouphy/wav2vec2-xls-r-300m-timit-phoneme
// via @huggingface/transformers (transformers.js) entirely in this process.
// Small config files ship in resources/phoneme-model/ (committed); the
// ~317MB ONNX weights are too large for the repo and are downloaded once
// into userData on first use, mirroring how Piper voices are external files.
const PHONEME_MODEL_URL = 'https://huggingface.co/stringbot/wav2vec2-xls-r-300m-timit-phoneme-onnx/resolve/main/onnx/model_quantized.onnx';
const PHONEME_MODEL_DIR_NAME = 'phoneme-onnx';

function phonemeModelsRoot() {
  return path.join(app.getPath('userData'), 'models');
}
function phonemeModelDir() {
  return path.join(phonemeModelsRoot(), PHONEME_MODEL_DIR_NAME);
}
function phonemeModelOnnxPath() {
  return path.join(phonemeModelDir(), 'onnx', 'model_quantized.onnx');
}

async function copyPhonemeModelConfigs(destDir) {
  const srcDir = path.join(__dirname, 'resources', 'phoneme-model');
  const files = ['config.json', 'preprocessor_config.json', 'special_tokens_map.json', 'tokenizer_config.json', 'vocab.json', 'tokenizer.json'];
  for (const f of files) {
    await fs.copyFile(path.join(srcDir, f), path.join(destDir, f));
  }
}

async function ensurePhonemeModel(event, { customModelDir } = {}) {
  // A user-supplied model folder (Settings override) always wins, in case
  // the community HF repo above ever moves or disappears. It must contain
  // the same layout we download automatically: config.json + tokenizer.json
  // + onnx/model_quantized.onnx.
  if (customModelDir) {
    const exists = await fs.access(path.join(customModelDir, 'onnx', 'model_quantized.onnx')).then(() => true).catch(() => false);
    if (!exists) return { error: `onnx/model_quantized.onnx was not found in directory: ${customModelDir}` };
    return { ready: true, custom: true };
  }

  const onnxPath = phonemeModelOnnxPath();
  const exists = await fs.access(onnxPath).then(() => true).catch(() => false);
  if (exists) return { ready: true };

  const dir = phonemeModelDir();
  await fs.mkdir(path.join(dir, 'onnx'), { recursive: true });
  await copyPhonemeModelConfigs(dir);

  let resp;
  try {
    resp = await fetch(PHONEME_MODEL_URL);
  } catch (err) {
    return { error: `Unable to download phoneme model: ${err.message}` };
  }
  if (!resp.ok || !resp.body) {
    return { error: `Unable to download model (HTTP ${resp.status}).` };
  }

  const total = Number(resp.headers.get('content-length')) || 0;
  const tmpPath = `${onnxPath}.download`;
  const writeStream = fsSync.createWriteStream(tmpPath);
  let received = 0;
  const sender = event && event.sender;

  try {
    for await (const chunk of resp.body) {
      received += chunk.length;
      await new Promise((resolve, reject) => {
        writeStream.write(chunk, (err) => (err ? reject(err) : resolve()));
      });
      if (sender && !sender.isDestroyed()) {
        sender.send('pronunciation:downloadProgress', { received, total });
      }
    }
    await new Promise((resolve, reject) => {
      writeStream.end((err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    writeStream.close();
    await fs.unlink(tmpPath).catch(() => {});
    return { error: `Model download failed: ${err.message}` };
  }

  await fs.rename(tmpPath, onnxPath);
  return { ready: true };
}

// Scoring: forced-alignment + Goodness-of-Pronunciation (GOP), the same
// family of technique used by ELSA/Speechace/Azure Pronunciation Assessment
// — instead of freely decoding the audio and diffing two independently
// produced phoneme strings (noisy: CTC greedy decoding merges/splits sounds
// at word boundaries with no language model, which was scoring transcription
// artifacts, not pronunciation), we already KNOW the expected phoneme
// sequence, so we force-align the audio to exactly that sequence and read
// off how confident the model was in each expected phoneme at its aligned
// frames versus the best competing phoneme at that same frame.
let phonemeModelPromise = null;
let phonemeModelKey = null;
async function getPhonemeModel(customModelDir) {
  const key = customModelDir || null;
  if (phonemeModelPromise && phonemeModelKey === key) return phonemeModelPromise;

  phonemeModelKey = key;
  phonemeModelPromise = (async () => {
    const { AutoProcessor, AutoModelForCTC, env } = require('@huggingface/transformers');
    env.allowRemoteModels = false;
    env.allowLocalModels = true;

    let modelDir;
    if (customModelDir) {
      env.localModelPath = path.dirname(customModelDir);
      modelDir = path.basename(customModelDir);
    } else {
      env.localModelPath = phonemeModelsRoot();
      modelDir = PHONEME_MODEL_DIR_NAME;
    }
    const [processor, model, vocab] = await Promise.all([
      AutoProcessor.from_pretrained(modelDir, { local_files_only: true }),
      AutoModelForCTC.from_pretrained(modelDir, { dtype: 'q8', local_files_only: true }),
      fs.readFile(path.join(__dirname, 'resources', 'phoneme-model', 'vocab.json'), 'utf-8').then(JSON.parse),
    ]);
    return { processor, model, vocab, blankId: vocab['[PAD]'] };
  })();
  return phonemeModelPromise;
}

function logSoftmaxRow(row) {
  let max = -Infinity;
  for (const v of row) if (v > max) max = v;
  let sum = 0;
  const exps = new Float64Array(row.length);
  for (let i = 0; i < row.length; i++) { exps[i] = Math.exp(row[i] - max); sum += exps[i]; }
  const logSum = Math.log(sum);
  const out = new Float64Array(row.length);
  for (let i = 0; i < row.length; i++) out[i] = (row[i] - max) - logSum;
  return out;
}

// Viterbi forced alignment over the blank-interleaved extended CTC label
// sequence [blank, y1, blank, y2, ..., yL, blank]. Returns, for each target
// phoneme, the list of audio frame indices aligned to it.
function ctcForceAlign(logProbsByFrame, targetIds, blankId) {
  const T = logProbsByFrame.length;
  const L = targetIds.length;
  const Z = 2 * L + 1;
  const ext = new Array(Z);
  for (let i = 0; i < Z; i++) ext[i] = (i % 2 === 0) ? blankId : targetIds[(i - 1) / 2];

  const NEG_INF = -1e15;
  const dp = Array.from({ length: T }, () => new Float64Array(Z).fill(NEG_INF));
  const back = Array.from({ length: T }, () => new Int32Array(Z).fill(-1));

  dp[0][0] = logProbsByFrame[0][ext[0]];
  if (Z > 1) dp[0][1] = logProbsByFrame[0][ext[1]];

  for (let t = 1; t < T; t++) {
    for (let s = 0; s < Z; s++) {
      let best = dp[t - 1][s];
      let bestPrev = s;
      if (s - 1 >= 0 && dp[t - 1][s - 1] > best) { best = dp[t - 1][s - 1]; bestPrev = s - 1; }
      if (s - 2 >= 0 && s % 2 === 1 && ext[s] !== ext[s - 2] && dp[t - 1][s - 2] > best) {
        best = dp[t - 1][s - 2]; bestPrev = s - 2;
      }
      if (best > NEG_INF) {
        dp[t][s] = best + logProbsByFrame[t][ext[s]];
        back[t][s] = bestPrev;
      }
    }
  }

  const endS = (Z === 1 || dp[T - 1][Z - 1] >= dp[T - 1][Z - 2]) ? Z - 1 : Z - 2;
  const path = new Int32Array(T);
  let s = endS;
  for (let t = T - 1; t >= 0; t--) {
    path[t] = s;
    if (t > 0) s = back[t][s];
  }

  const framesPerTarget = Array.from({ length: L }, () => []);
  for (let t = 0; t < T; t++) {
    const zi = path[t];
    if (zi % 2 === 1) framesPerTarget[(zi - 1) / 2].push(t);
  }
  return framesPerTarget;
}

// GOP(p) = avg over aligned frames of [ logP(p) - max_{q != p} logP(q) ].
// ~0 means the target phoneme WAS (tied for) the model's top pick at those
// frames — genuinely correct. Negative means something else was more
// likely there — the larger the gap, the more confidently "wrong".
function gopScore(logProbsByFrame, frames, targetId) {
  if (!frames.length) return null;
  let sum = 0;
  for (const t of frames) {
    const row = logProbsByFrame[t];
    let maxOther = -Infinity;
    for (let c = 0; c < row.length; c++) if (c !== targetId && row[c] > maxOther) maxOther = row[c];
    sum += (row[targetId] - maxOther);
  }
  return sum / frames.length;
}

// Heuristic (uncalibrated — no labeled pronunciation-error dataset to fit
// against) mapping of the unbounded GOP log-ratio onto a 0-100 scale.
// GOP=0 (tied with the best alternative) lands at 50; the sigmoid saturates
// quickly on either side since GOP magnitudes of a few units are already
// strong signal in practice (validated empirically: swapping one phoneme in
// a real recording moved GOP from +5 to -9).
function gopToScore100(gop) {
  const s = 1 / (1 + Math.exp(-gop / 2));
  return Math.round(Math.max(0, Math.min(100, s * 100)));
}

async function scorePronunciation(_event, { samples, sampleRate, targetPhones, customModelDir } = {}) {
  if (!Array.isArray(samples) && !(samples instanceof Float32Array)) {
    return { error: 'No audio data.' };
  }
  if (sampleRate !== 16000) return { error: 'Audio must use a 16 kHz sample rate.' };
  if (!Array.isArray(targetPhones) || !targetPhones.length) {
    return { error: 'No reference phonemes are available for scoring.' };
  }

  const onnxPath = customModelDir ? path.join(customModelDir, 'onnx', 'model_quantized.onnx') : phonemeModelOnnxPath();
  const exists = await fs.access(onnxPath).then(() => true).catch(() => false);
  if (!exists) return { error: 'The phoneme model is not ready. Please try again.' };

  try {
    const { processor, model, vocab, blankId } = await getPhonemeModel(customModelDir);
    const targetIds = targetPhones.map((p) => vocab[p]);
    const unknown = targetPhones.filter((p, i) => targetIds[i] === undefined);
    if (unknown.length) return { error: `Invalid phonemes: ${unknown.join(', ')}` };

    const audio = samples instanceof Float32Array ? samples : Float32Array.from(samples);
    const inputs = await processor(audio);
    const output = await model(inputs);
    const [, T, V] = output.logits.dims;
    const data = output.logits.data;
    const logProbsByFrame = [];
    for (let t = 0; t < T; t++) logProbsByFrame.push(logSoftmaxRow(data.slice(t * V, (t + 1) * V)));

    const framesPerTarget = ctcForceAlign(logProbsByFrame, targetIds, blankId);
    const phones = targetPhones.map((phone, i) => {
      const gop = gopScore(logProbsByFrame, framesPerTarget[i], targetIds[i]);
      return { phone, score: gop === null ? null : gopToScore100(gop) };
    });
    const scored = phones.filter((p) => p.score !== null);
    const overallScore = scored.length ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : null;
    return { phones, overallScore };
  } catch (err) {
    return { error: `Pronunciation scoring failed: ${err.message}` };
  }
}

async function piperSpeak(_event, { piperPath, modelPath, text, rate }) {
  if (!piperPath || !modelPath) {
    return { error: 'Piper is not configured. Set the executable and voice model paths.' };
  }
  if (!text || !text.trim()) {
    return { error: 'No text to read.' };
  }

  const exists = await fs.access(piperPath).then(() => true).catch(() => false);
  if (!exists) return { error: `Piper executable was not found at: ${piperPath}` };
  const modelExists = await fs.access(modelPath).then(() => true).catch(() => false);
  if (!modelExists) return { error: `Voice model was not found at: ${modelPath}` };

  const lengthScale = rate && rate > 0 ? (1 / rate).toFixed(3) : '1';
  const outFile = path.join(os.tmpdir(), `vocabtyping-piper-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);

  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(piperPath, ['--model', modelPath, '--output_file', outFile, '--length_scale', lengthScale]);
    } catch (err) {
      resolve({ error: `Unable to run Piper: ${err.message}` });
      return;
    }

    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => resolve({ error: `Unable to run Piper: ${err.message}` }));
    proc.on('close', async (code) => {
      if (code !== 0) {
        resolve({ error: `Piper exited with error code ${code}: ${stderr.slice(0, 300) || '(no error details)'}` });
        return;
      }
      try {
        const audio = await fs.readFile(outFile);
        fs.unlink(outFile).catch(() => {});
        resolve({ audioBase64: audio.toString('base64') });
      } catch (err) {
        resolve({ error: `Unable to read Piper audio file: ${err.message}` });
      }
    });

    proc.stdin.write(text.trim() + '\n');
    proc.stdin.end();
  });
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

async function translateWithLlm(_event, { baseUrl, apiKey, model, term, context }) {
  if (!baseUrl || !apiKey || !model) {
    return { error: 'LLM is not configured. Set the Base URL, API Key, and Model in Settings.' };
  }
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const prompt = [
    'You are a bilingual dictionary assistant helping a Vietnamese learner of a foreign language.',
    'Given a word or phrase and its surrounding context, respond with ONLY a raw JSON object (no markdown code fences, no extra text) with exactly these keys:',
    '{"term": string, "meaning_vi": string, "ipa": string, "part_of_speech": string, "example": string, "example_translation_vi": string}',
    '- meaning_vi: the meaning/translation in Vietnamese, tailored to how the term is used in the given context.',
    '- ipa: IPA pronunciation if applicable, else empty string.',
    '- example: a short example sentence using the term (may reuse the given context).',
    '- example_translation_vi: Vietnamese translation of the example sentence.',
  ].join('\n');
  const userMsg = `Context: "${context || ''}"\nWord/phrase to translate: "${term}"`;

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.2,
      }),
    });
  } catch (err) {
    return { error: `Unable to connect to LLM: ${err.message}` };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { error: `LLM returned an error (${resp.status}): ${text.slice(0, 300)}` };
  }

  const data = await resp.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { error: 'LLM returned no valid content.' };

  const parsed = extractJson(content);
  if (!parsed) return { error: 'Unable to parse the LLM JSON response.' };

  return {
    term: parsed.term || term,
    meaning: parsed.meaning_vi || '',
    ipa: parsed.ipa || '',
    pos: parsed.part_of_speech || '',
    example: parsed.example || '',
    exampleTranslation: parsed.example_translation_vi || '',
  };
}

async function fetchAnotherExample(_event, { baseUrl, apiKey, model, term, context, previousExamples }) {
  if (!baseUrl || !apiKey || !model) {
    return { error: 'LLM is not configured. Set the Base URL, API Key, and Model in Settings.' };
  }
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const avoidList = (previousExamples || []).filter(Boolean);
  const prompt = [
    'You are a bilingual dictionary assistant helping a Vietnamese learner of a foreign language.',
    'Given a word or phrase and its surrounding context, respond with ONLY a raw JSON object (no markdown code fences, no extra text) with exactly these keys:',
    '{"example": string, "example_translation_vi": string}',
    '- example: a short, natural example sentence in the original language that uses the term.',
    '- example_translation_vi: Vietnamese translation of that example sentence.',
    avoidList.length
      ? `- The example MUST be genuinely different from these previously shown examples (do not reuse or lightly reword them): ${avoidList.map(e => `"${e}"`).join(' | ')}`
      : '',
  ].filter(Boolean).join('\n');
  const userMsg = `Context: "${context || ''}"\nWord/phrase: "${term}"`;

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.8,
      }),
    });
  } catch (err) {
    return { error: `Unable to connect to LLM: ${err.message}` };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { error: `LLM returned an error (${resp.status}): ${text.slice(0, 300)}` };
  }

  const data = await resp.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { error: 'LLM returned no valid content.' };

  const parsed = extractJson(content);
  if (!parsed) return { error: 'Unable to parse the LLM JSON response.' };

  return {
    example: parsed.example || '',
    exampleTranslation: parsed.example_translation_vi || '',
  };
}

async function testLlmConnection(_event, { baseUrl, apiKey, model }) {
  if (!baseUrl || !apiKey || !model) {
    return { ok: false, error: 'Enter the Base URL, API Key, and Model.' };
  }
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly one word: OK' }],
        max_tokens: 10,
        temperature: 0,
      }),
    });
  } catch (err) {
    return { ok: false, error: `Unable to connect: ${err.message}` };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { ok: false, error: `Error (${resp.status}): ${text.slice(0, 300)}` };
  }

  const data = await resp.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { ok: false, error: 'No valid response was received from the LLM.' };

  return { ok: true, reply: content.trim() };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#f2f2f3',
    icon: path.join(__dirname, 'renderer', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('data:load', loadData);
  ipcMain.handle('data:save', saveData);
  ipcMain.handle('pronunciation:saveRecording', (_event, bytes) => recordings.save(bytes));
  ipcMain.handle('pronunciation:readRecording', (_event, id) => recordings.read(id));
  ipcMain.handle('dialog:openMarkdown', openMarkdownFile);
  ipcMain.handle('llm:translate', translateWithLlm);
  ipcMain.handle('llm:example', fetchAnotherExample);
  ipcMain.handle('llm:test', testLlmConnection);
  ipcMain.handle('dialog:browseFile', browseFile);
  ipcMain.handle('dialog:saveMarkdown', saveMarkdownFile);
  ipcMain.handle('pdf:saveReading', saveReadingAsPdf);
  ipcMain.handle('piper:speak', piperSpeak);
  ipcMain.handle('dict:lookup', dictLookup);
  ipcMain.handle('dict:chooseCustomPath', chooseCustomDictionaryPath);
  ipcMain.handle('dict:addCustomEntry', addCustomDictionaryEntry);
  ipcMain.handle('translate:google', googleTranslate);
  ipcMain.handle('pronunciation:ensureModel', ensurePhonemeModel);
  ipcMain.handle('pronunciation:score', scorePronunciation);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
