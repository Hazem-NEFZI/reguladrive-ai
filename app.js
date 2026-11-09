'use strict';
const corpus = [
  {id:'SIM-FRE-01',title:'Freinage · Traçabilité des essais',tags:'freinage essai preuve rapport dossier',before:'Le dossier contient le rapport final de l’essai de freinage.',after:'Le dossier contient le rapport final et les relevés bruts de l’essai de freinage, associés à la version du logiciel testé.',change:'Ajout des relevés bruts et de la référence logicielle.',team:'Essais véhicule',action:'Vérifier que le rapport et les relevés sont reliés à la version logicielle du véhicule testé.'},
  {id:'SIM-CYB-01',title:'Cybersécurité · Suivi des incidents',tags:'cybersecurite incident registre journal logiciel',before:'Un registre consigne les incidents de cybersécurité signalés.',after:'Le registre consigne les incidents de cybersécurité, leur niveau de gravité et la décision de clôture validée.',change:'Ajout de la gravité et de la validation de clôture.',team:'Cybersécurité véhicule',action:'Vérifier que le formulaire d’incident contient les champs gravité et décision de clôture.'},
  {id:'SIM-ENV-01',title:'Environnement · Particules de frein',tags:'particules frein environnement emission mesure',before:'Le dossier indique la masse de particules mesurée pendant l’essai.',after:'Le dossier indique la masse de particules mesurée, les conditions ambiantes et l’identifiant du banc d’essai.',change:'Ajout des conditions ambiantes et de la référence du banc.',team:'Essais environnement',action:'Ajouter les conditions ambiantes et l’identifiant du banc à la fiche de mesure.'}
];
const byId = id => document.getElementById(id);
const make = (tag, value, cls) => {const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const words = value => normalize(value).match(/[a-z0-9]+/g) || [];
const statuses = ['À examiner','En revue','Revu'];
const storageKey = 'reguladrive-v1';
let tasks = {};
let notes = {};
let drafts = {};
function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
const imports = readStorage('reguladrive-imports', []);
if (Array.isArray(imports)) {
  for (const c of imports) {
    if (typeof c?.id === 'string' && /^IMPORT-[a-zA-Z0-9-]+$/.test(c.id) &&
        ['title','before','after','tags','team','change','action'].every(k=>typeof c[k]==='string') &&
        !corpus.some(item=>item.id===c.id)) corpus.push(c);
  }
}
const savedTasks = readStorage(storageKey, {});
const savedNotes = readStorage('reguladrive-notes', {});
const savedDrafts = readStorage('reguladrive-drafts', {});
for(const c of corpus) {
  if(statuses.includes(savedTasks?.[c.id])) tasks[c.id] = savedTasks[c.id];
  if(typeof savedNotes?.[c.id]==='string') notes[c.id] = savedNotes[c.id];
  if(savedDrafts?.[c.id]) drafts[c.id] = savedDrafts[c.id];
}
function persist(){
  try {
    localStorage.setItem('reguladrive-imports',JSON.stringify(corpus.filter(c=>c.id.startsWith('IMPORT-'))));
    localStorage.setItem(storageKey,JSON.stringify(tasks));
    localStorage.setItem('reguladrive-notes',JSON.stringify(notes));
    localStorage.setItem('reguladrive-drafts',JSON.stringify(drafts));
    return true;
  } catch {
    byId('notice').textContent='Stockage local indisponible. Exportez les fiches pour les conserver.';
    return false;
  }
}
function rank(query){
  const tokens = [...new Set(words(query).filter(t=>t.length>2 && !['les','des','une','quel','quelle','quels','pour','dans','apres','avec','est','que','sur'].includes(t)))];
  return corpus.map(c=>{
    const labels=new Set(words(c.tags+' '+c.title+' '+c.id));
    const quote=new Set(words(c.before+' '+c.after));
    return {c,score:tokens.reduce((score,t)=>score+(labels.has(t)?3:quote.has(t)?1:0),0)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function search(){
  const query=byId('query').value.trim(), results=rank(query);
  byId('hits').replaceChildren();
  byId('result').textContent=!query?'Saisissez une question ou choisissez un exemple.':results.length?results.length+' clause(s) trouvée(s).':'Aucune clause trouvée. Essayez un autre mot-clé.';
  for(const {c} of results){
    const card=make('article','');
    const button=make('button','Comparer les versions','alt');
    button.onclick=()=>{byId('clause').value=c.id;compare();if(typeof openPanel==='function')openPanel('comparaison');byId('clause').focus();};
    card.append(make('span',c.id+' / version 2 · '+(c.id.startsWith('SIM-')?'Fictif':'Importé'),'tag'),make('h3',c.title),make('blockquote',c.after),button);
    byId('hits').append(card);
  }
}
function selected(){return corpus.find(c=>c.id===byId('clause').value);}
function compare(){
  const c=selected();
  byId('versions').replaceChildren();
  for(const [label,quote,cls] of [['Version 1',c.before,'old'],['Version 2',c.after,'new']]){
    const card=make('article','',cls);
    card.append(make('span',c.id+' / '+label,'tag'),make('blockquote',quote));
    byId('versions').append(card);
  }
  byId('impact').replaceChildren(make('h3','Changement à examiner'),make('p',c.change),make('p','Équipe proposée · '+c.team),make('p',c.action));
  const split = text => text.match(/[^.!?]+[.!?]*|[.!?]+/g)?.map(part=>part.trim()).filter(Boolean) || [];
  const before=split(c.before), after=split(c.after);
  const diff=make('details','');
  diff.append(make('summary','Voir les phrases ajoutées ou retirées'));
  for(const [label,items] of [['Retirées ou reformulées',before.filter(line=>!after.includes(line))],['Ajoutées ou reformulées',after.filter(line=>!before.includes(line))]]) {
    diff.append(make('strong',label));
    const list=make('ul','');
    for(const line of items.length?items:['Aucune'])list.append(make('li',line));
    diff.append(list);
  }
  byId('impact').append(diff);
  byId('notice').textContent='';
}
function renderTasks(){
  byId('count-tasks').textContent=Object.keys(tasks).length+' fiche(s)';
  byId('tasks').replaceChildren();
  byId('export').disabled=!Object.keys(tasks).length;
  if(!Object.keys(tasks).length)byId('tasks').append(make('p','Aucune fiche ajoutée.','muted'));
  for(const c of corpus.filter(c=>Object.hasOwn(tasks,c.id))){
    const card=make('article',''),select=make('select',''),label=make('label','Statut de revue');
    select.id='status-'+c.id;label.htmlFor=select.id;
    for(const s of statuses)select.add(new Option(s,s));
    select.value=tasks[c.id];
    select.onchange=()=>{tasks[c.id]=select.value;persist();};
    const remove=make('button','Retirer la fiche','alt');
    remove.onclick=()=>{delete tasks[c.id];delete notes[c.id];delete drafts[c.id];persist();renderTasks();byId('add').focus();};
    card.append(make('h3',c.id+' · '+c.title),make('p',c.action),label,select,remove);
    const note=make('textarea','','review-note'), noteLabel=make('label','Note du spécialiste');
    note.id='note-'+c.id;noteLabel.htmlFor=note.id;note.maxLength=2000;note.value=notes[c.id]||'';
    note.onchange=()=>{notes[c.id]=note.value;persist();};
    card.append(noteLabel,note);
    const draft=drafts[c.id];
    if(draft && typeof draft.answer==='string' && Array.isArray(draft.sources)){
      const details=make('details','');
      details.append(make('summary','Brouillon IA et sources'),make('p',draft.model+' · '+draft.mode,'muted'),make('div',draft.answer,'answer'));
      for(const source of draft.sources){
        const excerpt=make('details','');
        excerpt.append(make('summary',source.ref+' · '+source.titre),make('blockquote',source.extrait));
        details.append(excerpt);
      }
      card.append(details);
    }
    byId('tasks').append(card);
  }
}
byId('search').onclick=search;
byId('query').onkeydown=e=>{if(e.key==='Enter')search();};
for(const b of document.querySelectorAll('.example'))b.onclick=()=>{byId('query').value=b.textContent;search();};
for(const c of corpus)byId('clause').add(new Option(c.title,c.id));
byId('clause').onchange=compare;
byId('add').onclick=()=>{
  const id=selected().id;
  if(Object.hasOwn(tasks,id)){byId('notice').textContent='Cette fiche figure déjà dans le suivi.';return;}
  tasks[id]=statuses[0];byId('notice').textContent='Fiche ajoutée au suivi.';persist();renderTasks();
};
byId('export').onclick=()=>{
  const rows=corpus.filter(c=>Object.hasOwn(tasks,c.id)).map(({id,title,before,after,change,team,action})=>({id,title,before,after,change,team,action,statut:tasks[id],note:notes[id]||'',brouillonIA:drafts[id]||null}));
  const blob=new Blob([JSON.stringify({corpus:'fictif',fiches:rows},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), link=make('a','');
  link.href=url;link.download='reguladrive-fiches.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
byId('count-corpus').textContent=corpus.length+' clauses';
byId('query').value='freinage';search();compare();renderTasks();
