const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocab-reading-test-'));
  let selected = null;
  const electron = {
    app: {getPath:()=>dir, whenReady:()=>({then:()=>{}}), on:()=>{}},
    BrowserWindow: {getFocusedWindow:()=>null},
    dialog: {showOpenDialog:async()=>selected ? {filePaths:[selected]} : {canceled:true}},
  };
  const context = vm.createContext({require:n=>n==='electron'?electron:require(n.startsWith('./')?path.resolve(n):n), Buffer, console, __dirname:path.resolve('.')});
  vm.runInContext(await fs.readFile('main.js','utf8'), context);
  const file = path.join(dir,'vocabtyping-data.json');
  const legacy = {readings:[{id:1,body:'# Original',highlights:[{start:0,end:3,text:'Ori'}]}],posts:[{id:4}]};
  await fs.writeFile(file,JSON.stringify(legacy));
  const migrated = await vm.runInContext('loadData()',context);
  assert.equal(migrated.readings[0].type,'markdown');
  assert.equal(migrated.readings[0].highlights[0].text,'Ori');
  assert.deepEqual(JSON.parse(await fs.readFile(file+'.before-document-types.bak','utf8')),legacy);
  const again = await vm.runInContext('loadData()',context);
  assert.equal(JSON.stringify(migrated),JSON.stringify(again));
  selected = path.join(dir,'test.pdf');
  await fs.writeFile(selected,'%PDF-1.4\nfixture');
  const pdf = await vm.runInContext('openMarkdownFile()',context);
  assert.equal(pdf.type,'pdf');
  assert.equal(Buffer.from(pdf.pdfData,'base64').toString(),'%PDF-1.4\nfixture');
  selected = path.join(dir,'test.md');
  await fs.writeFile(selected,'# Markdown content');
  assert.equal((await vm.runInContext('openMarkdownFile()',context)).type,'markdown');
  selected = null;
  assert.equal(await vm.runInContext('openMarkdownFile()',context),null);
  await fs.writeFile(file,'invalid data');
  await assert.rejects(vm.runInContext('loadData()',context));
  console.log('PASS: migration, backup, idempotence, annotations, PDF/Markdown import, cancel, corrupt-data protection');
})().catch(err=>{console.error(err);process.exitCode=1});
