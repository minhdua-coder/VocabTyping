// Keep PDF text in the same DOM as Markdown so selection offsets and annotations
// use the existing Reading features. Never execute embedded PDF JavaScript.
let pdfLibrary;
let activePdfTask;
window.renderPdfReading = async function (base64) {
  pdfLibrary ||= import('../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = await pdfLibrary;
  if (activePdfTask) await activePdfTask.destroy();
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', location.href).href;
  const task = pdfjs.getDocument({
    data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
    isEvalSupported: false,
    cMapUrl: new URL('../node_modules/pdfjs-dist/cmaps/', location.href).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', location.href).href,
  });
  activePdfTask = task;
  try {
    const pdf = await task.promise;
    const fragment = document.createDocumentFragment();
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const availableWidth = document.getElementById('reading-preview').clientWidth - 24;
      const scale = Math.min(1.5, Math.max(320, availableWidth) / page.getViewport({ scale: 1 }).width);
      const viewport = page.getViewport({ scale });
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page';
      wrapper.setAttribute('aria-label', `Page ${number}`);
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;
      wrapper.style.setProperty('--scale-factor', viewport.scale);
      wrapper.style.setProperty('--total-scale-factor', viewport.scale);
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const textLayer = document.createElement('div');
      textLayer.className = 'textLayer';
      const content = await page.getTextContent();
      const layer = new pdfjs.TextLayer({ textContentSource: content, container: textLayer, viewport });
      await layer.render();
      // Measure with a fresh context: PDF.js can retain stale font metrics after
      // resetting its shared measurement canvas, misaligning selection boxes.
      const measure = document.createElement('canvas').getContext('2d');
      const items = content.items.filter(item => typeof item.str === 'string');
      layer.textDivs.forEach((span, index) => {
        const item = items[index];
        if (!item?.str || !span.style.getPropertyValue('--scale-x')) return;
        const height = parseFloat(span.style.getPropertyValue('--font-height'));
        measure.font = `${height}px ${span.style.fontFamily}`;
        const width = measure.measureText(item.str).width;
        if (width) span.style.setProperty('--scale-x', (content.styles[item.fontName]?.vertical ? item.height : item.width) / width);
      });
      textLayer.querySelectorAll('br').forEach(br => br.after(document.createTextNode('\n')));
      wrapper.append(canvas, textLayer);
      fragment.append(wrapper, document.createTextNode('\n'));
      page.cleanup();
    }
    return fragment;
  } catch (error) {
    await task.destroy();
    if (activePdfTask === task) activePdfTask = null;
    throw error;
  }
};

