const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
function fixture(twoPages = false, text = "Hello PDF reading world") {
  const stream = 'BT /F1 20 Tf 40 150 Td (' + text + ') Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'];
  if (twoPages) { objects[1] = '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>'; objects.push(objects[2]); }
  let out = '%PDF-1.4\n', offsets = [0];
  objects.forEach((o, i) => { offsets.push(Buffer.byteLength(out)); out += (i+1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const start = Buffer.byteLength(out);
  out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + start + '\n%%EOF';
  return Buffer.from(out).toString('base64');
}
app.whenReady().then(async () => {
  ipcMain.handle('data:load', () => ({ readings: [{id: 1, title: 'Legacy', body: 'Legacy markdown content', highlights: []}] }));
  ipcMain.handle('data:save', () => {});
  const win = new BrowserWindow({ show: false, width: 1280, height: 860, webPreferences: { offscreen: true, backgroundThrottling: false, preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) console.error(message); });
  await win.loadFile(path.join(__dirname, '..', 'renderer/index.html'));
  const result = await win.webContents.executeJavaScript(`(async () => {
    const check = (ok, msg) => { if (!ok) throw new Error(msg); };
    await loadPersisted();
    check(state.readings[0].type === 'markdown', 'Legacy type');
    state.section = 'reading';
    state.readings.push({ id: 2, type: 'pdf', title: 'PDF test', body: '', pdfData: '${fixture()}', highlights: [] });
    state.currentReadingId = 2;
    renderAll();
    await renderReadingDetail();
    const preview = document.getElementById('reading-preview');
    check(preview.querySelector('canvas'), 'PDF canvas missing: ' + preview.textContent);
    check(preview.textContent.includes('Hello PDF reading world'), 'PDF text missing');
    const node = getTextNodesIn(preview).find(n => n.textContent.includes('Hello'));
    const range = document.createRange();
    range.setStart(node, 0); range.setEnd(node, 5);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    onReadingPreviewMouseUp();
    check(state.pendingSelection.text === 'Hello', 'selection menu');
    state.readings[1].highlights.push({id:'test', start:0, end:5, text:'Hello', color:'#ffff00'});
    await renderReadingDetail();
    check(preview.querySelector('mark.hl').textContent === 'Hello', 'highlight restore');
    runReadingSearch('world');
    check(state.readingSearchMatches.length === 1, 'PDF search');
    check(preview.querySelector('mark.search-hl').textContent === 'world', 'search mark');
    const before = preview.textContent;
    state.currentReadingId = 1; await renderReadingDetail();
    check(preview.textContent.includes('Legacy markdown'), 'Markdown regression');
    const multi = await window.renderPdfReading('${fixture(true)}');
    check(multi.querySelectorAll('canvas').length === 2, 'Multiple PDF pages');
    const scan = await window.renderPdfReading('${fixture(false, '')}');
    check(!scan.textContent.trim(), 'Image-only PDF text detection');
    let failed = false;
    try { await window.renderPdfReading(btoa('invalid PDF')); } catch { failed = true; }
    check(failed, 'Invalid PDF rejection');
    state.currentReadingId = 2; await renderReadingDetail();
    check(preview.textContent === before, 'Stable offsets after reopen');
    check(preview.querySelector('mark.hl').textContent === 'Hello', 'Highlight after reopen');
    hideSelectionMenu(); window.getSelection().removeAllRanges();
    const mark = preview.querySelector('mark.hl');
    check(mark.getBoundingClientRect().width > 60 && mark.getBoundingClientRect().width < 80, 'PDF highlight geometry');
    return {text:preview.textContent, pages:preview.querySelectorAll('canvas').length};
  })()`);
  assert.equal(result.pages, 1);
  await new Promise(resolve => setTimeout(resolve, 600));
  await require('node:fs/promises').writeFile(require('node:path').join(require('node:os').tmpdir(), 'vocab-pdf-preview.png'), (await win.webContents.capturePage()).toPNG());
  console.log('PASS: legacy type, PDF render, selection, highlight, search, Markdown, reopen', result);
  app.exit(0);
}).catch(err => { console.error(err); app.exit(1); });
setTimeout(() => { console.error('Test timed out'); app.exit(1); }, 45000);
