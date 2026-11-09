'use strict';
let latestAnalysis;
function downloadJSON(name, payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}));
  const link = make('a', '');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const [fileId, textId] of [['old-file','doc-old'],['new-file','doc-new']]) {
  byId(fileId).onchange = async () => {
    const file = byId(fileId).files[0];
    if (!file) return;
    if (file.size > 20000) {
      byId('import-status').textContent = 'Fichier trop long. Sélectionnez un extrait de 5 000 caractères maximum.';
      return;
    }
    try {
      const content = await file.text();
      if (content.length > 5000) throw new Error('Texte trop long.');
      byId(textId).value = content;
      byId('import-status').textContent = '';
    } catch {
      byId('import-status').textContent = 'Lecture impossible ou texte supérieur à 5 000 caractères.';
    }
  };
}
byId('import').onclick = () => {
  const [title,before,after] = ['doc-title','doc-old','doc-new'].map(id=>byId(id).value.trim());
  if (!title || !before || !after) {
    byId('import-status').textContent = 'Indiquez le titre et les deux versions.';
    return;
  }
  const id = 'IMPORT-' + Date.now() + '-' + corpus.length;
  corpus.push({id,title,before,after,tags:title,change:before===after?'Textes identiques.':'Textes différents. Utilisez le mode Comparaison de versions pour préparer la revue.',team:'À définir',action:'Vérifier les écarts avec le spécialiste et consigner les preuves attendues.'});
  byId('clause').add(new Option(title,id));
  byId('clause').value=id;
  compare();
  byId('count-corpus').textContent=corpus.length+' clauses';
  byId('import-status').textContent=persist()?'Clause enregistrée et sélectionnée dans le comparateur.':'Clause ajoutée pour cette session. Le stockage local est indisponible.';
  search();
  if(typeof openPanel==='function'){openPanel('comparaison');byId('clause').focus();}
};
byId('check-ai').onclick = async () => {
  const status = byId('ai-status');
  if (location.protocol === 'file:') {status.textContent='Lancez server.py';return;}
  status.textContent='Vérification…';
  try {
    const response=await fetch('/api/status');
    const data=await response.json();
    status.textContent=response.ok?(data.ready?'Prêt · '+data.model:'À télécharger · '+data.model):data.error;
  } catch {status.textContent='Serveur indisponible';}
};
byId('ask').onclick = async () => {
  const status = byId('ai-progress');
  const question = byId('ai-question').value.trim();
  const mode = byId('mode').value;
  const query = byId('query').value.trim() || question;
  const clauses = byId('scope').value==='search'?rank(query).slice(0,2).map(row=>row.c):[selected()];
  if (location.protocol==='file:') {status.textContent='Pour activer l’IA, lancez python server.py et ouvrez http://127.0.0.1:8765.';return;}
  if (!clauses.length || (mode==='answer' && !question)) {status.textContent='Saisissez une question ou sélectionnez une clause pertinente.';return;}
  latestAnalysis = undefined;
  byId('export-ai').hidden=true;
  byId('save-analysis').hidden=true;
  byId('ai-output').replaceChildren();
  byId('ask').disabled=true;
  status.textContent='Analyse locale en cours… Le premier chargement peut prendre du temps.';
  try {
    const response=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,question,clauses})});
    const data=await response.json();
    if (!response.ok) throw new Error(data.error);
    const refs=[...new Set(data.answer.match(/\[S\d+-V\d+\]/g)||[])].map(ref=>ref.slice(1,-1));
    const allowed=new Set(data.sources.map(source=>source.ref));
    const invalid=refs.filter(ref=>!allowed.has(ref));
    status.textContent=invalid.length?'Référence inconnue : '+invalid.join(', '):refs.length?'Références présentes dans le corpus envoyé. Vérifiez le lien entre chaque affirmation et sa source.':'Aucune citation reconnue. Relisez la réponse avec les sources.';
    const card=make('article','');
    card.append(make('span',data.model+' · Brouillon IA','tag'),make('div',data.answer,'answer'));
    for(const source of data.sources){
      const details=make('details','');
      details.append(make('summary',source.ref+' · '+source.titre),make('blockquote',source.extrait));
      card.append(details);
    }
    byId('ai-output').append(card);
    latestAnalysis={mode,question,clauses:clauses.map(({id,title})=>({id,title})),...data,review:'À vérifier',invalidReferences:invalid};
    byId('export-ai').hidden=false;
    byId('save-analysis').hidden=false;
  } catch(error) {status.textContent=error.message;}
  finally {byId('ask').disabled=false;}
};
byId('export-ai').onclick=()=>{if(latestAnalysis)downloadJSON('reguladrive-analyse.json',latestAnalysis);};

byId('save-analysis').onclick=()=>{
  if(!latestAnalysis)return;
  const ids=latestAnalysis.clauses.map(c=>c.id);
  const targets=ids.filter(id=>!Object.hasOwn(drafts,id));
  if(!targets.length){byId('ai-progress').textContent='Un brouillon est déjà joint à chaque fiche concernée. Exportez cette nouvelle analyse pour la conserver.';return;}
  for(const id of targets){
    if(!Object.hasOwn(tasks,id))tasks[id]=statuses[0];
    drafts[id]=latestAnalysis;
  }
  const saved=persist();
  renderTasks();
  byId('ai-progress').textContent=(saved?'Brouillon enregistré dans le suivi.':'Brouillon ajouté pour cette session. Exportez le suivi pour le conserver.')+
    (targets.length<ids.length?' Les brouillons déjà présents sont conservés.':'');
};
