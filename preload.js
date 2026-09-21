const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  openMarkdownFile: () => ipcRenderer.invoke('dialog:openMarkdown'),
  translateWithLlm: (payload) => ipcRenderer.invoke('llm:translate', payload),
  fetchAnotherExample: (payload) => ipcRenderer.invoke('llm:example', payload),
  testLlmConnection: (payload) => ipcRenderer.invoke('llm:test', payload),
  browseFile: (opts) => ipcRenderer.invoke('dialog:browseFile', opts),
  saveMarkdownFile: (payload) => ipcRenderer.invoke('dialog:saveMarkdown', payload),
  saveReadingAsPdf: (payload) => ipcRenderer.invoke('pdf:saveReading', payload),
  piperSpeak: (payload) => ipcRenderer.invoke('piper:speak', payload),
  dictLookup: (payload) => ipcRenderer.invoke('dict:lookup', payload),
  chooseCustomDictionaryPath: () => ipcRenderer.invoke('dict:chooseCustomPath'),
  addCustomDictionaryEntry: (payload) => ipcRenderer.invoke('dict:addCustomEntry', payload),
  googleTranslate: (payload) => ipcRenderer.invoke('translate:google', payload),
  ensurePronunciationModel: (payload) => ipcRenderer.invoke('pronunciation:ensureModel', payload),
  scorePronunciation: (payload) => ipcRenderer.invoke('pronunciation:score', payload),
  savePronunciationRecording: (bytes) => ipcRenderer.invoke('pronunciation:saveRecording', bytes),
  readPronunciationRecording: (id) => ipcRenderer.invoke('pronunciation:readRecording', id),
  onPronunciationDownloadProgress: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('pronunciation:downloadProgress', listener);
    return () => ipcRenderer.removeListener('pronunciation:downloadProgress', listener);
  },
});
