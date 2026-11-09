const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor() { this.children=[]; this.value=''; this.textContent=''; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children=items; }
  add(option) { if (!this.value) this.value=option.value; this.children.push(option); }
  focus() {}
}
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id,new Element());
  return elements.get(id);
};
const storage = new Map();
function run() {
  const env=vm.createContext({
    document:{getElementById:element,createElement:()=>new Element(),querySelectorAll:()=>[]},
    localStorage:{getItem:k=>storage.get(k) ?? null,setItem:(k,v)=>storage.set(k,v)},
    Option:class {constructor(text,value){this.text=text;this.value=value;}},
    location:{protocol:'http:'},
    fetch:async (path, request)=>{
      assert.equal(path,'/api/ask');
      const payload=JSON.parse(request.body);
      assert.equal(payload.clauses[0].title,'Essai importé');
      return {ok:true,json:async()=>({model:'test',answer:'Joindre les relevés [S1-V2].',
        sources:[{ref:'S1-V2',titre:'Essai importé',extrait:payload.clauses[0].after}]})};
    }
  });
  for (const name of ['app.js','ai.js']) vm.runInContext(fs.readFileSync(name,'utf8'),env,{filename:name});
}
(async()=>{
  run();
  assert.match(element('result').textContent,/1 clause/);
  element('doc-title').value='Essai importé';
  element('doc-old').value='Joindre le rapport.';
  element('doc-new').value='Joindre le rapport et les relevés.';
  element('import').onclick();
  const id=element('clause').value;
  element('mode').value='impact';
  element('scope').value='selected';
  await element('ask').onclick();
  assert.match(element('ai-progress').textContent,/Références présentes/);
  element('save-analysis').onclick();
  assert.match(element('ai-progress').textContent,/Brouillon enregistré/);
  assert.equal(JSON.parse(storage.get('reguladrive-drafts'))[id].sources[0].ref,'S1-V2');
  elements.clear();
  run();
  assert.equal(element('count-corpus').textContent,'4 clauses');
  assert.equal(element('count-tasks').textContent,'1 fiche(s)');
  console.log('Search, import, AI draft, and reload passed.');
})().catch(error=>{ console.error(error); process.exitCode=1; });
