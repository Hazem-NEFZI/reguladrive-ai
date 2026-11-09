'use strict';
const euRows = EU_ACTS.flatMap(doc=>doc.passages.map((passage,index)=>({
  doc, passage, key:[doc.id,index], tokens:words(passage.section+' '+passage.text),
})));
const euStop = new Set('les des une que quels quelle quelles pour dans sur sont est aux ces ses par avec dont comment quoi quel selon entre'.split(' '));
let euResults = [];
const allActs = new Option('Tous les actes','');
byId('eu-act').add(allActs);
for(const doc of EU_ACTS)byId('eu-act').add(new Option(doc.id+' · '+doc.title,doc.id));
byId('eu-count').textContent=EU_ACTS.length+' actes · '+euRows.length.toLocaleString('fr-FR')+' passages';
function euRank(query, act){
  const terms = [...new Set(words(query).filter(token=>token.length>=3&&!euStop.has(token)))];
  const candidates=euRows.filter(row=>!act||row.doc.id===act);
  const frequency=new Map(terms.map(term=>[term,candidates.filter(row=>row.tokens.includes(term)).length]));
  return candidates.map(row=>{
    const keywords=words(row.doc.tags+' '+row.doc.title+' '+row.doc.id);
    const score=terms.reduce((sum,term)=>{
      const count=row.tokens.filter(t=>t===term).length;
      return sum+(count?Math.log(1+candidates.length/(1+frequency.get(term)))*(1+Math.log(count)):0)+(keywords.includes(term)?0.55:0);
    },0);
    return {row,score};
  }).sort((a,b)=>b.score-a.score);
}
function officialLink(source){
  const link=make('a','Ouvrir la source officielle EUR-Lex');
  link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
  return link;
}
async function euPost(route,query,rows){
  if(location.protocol==='file:')throw new Error('Lancez RUN_WINDOWS.bat pour activer Ollama.');
  const response=await fetch('./api/eu/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,keys:rows.map(row=>row.key)})});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Utilisez le serveur local RegulaDrive pour activer Ollama.');
  const data=await response.json();
  if(!response.ok)throw new Error(data.error);
  return data;
}
function showEU(rows){
  byId('eu-results').replaceChildren();
  for(const {doc,passage} of rows){
    const card=make('article','');
    const details=make('details','');
    details.append(make('summary','Lire l’extrait indexé'),make('blockquote',passage.text));
    card.append(make('span',doc.category+' · '+doc.id,'tag'),make('h3',doc.title),make('p',passage.section+' · '+doc.language,'muted'),details,officialLink(passage));
    byId('eu-results').append(card);
  }
  byId('eu-ask').hidden=!rows.length;
}
byId('eu-search').onclick=async()=>{
  const query=byId('eu-query').value.trim(), act=byId('eu-act').value, mode=byId('eu-mode').value;
  byId('eu-answer').replaceChildren();
  byId('eu-ai-status').textContent='';
  byId('eu-ask').hidden=true;
  const status=byId('eu-status');
  const ranked=euRank(query,act);
  if(!query){
    const docs=EU_ACTS.filter(doc=>!act||doc.id===act);
    byId('eu-results').replaceChildren(...docs.map(doc=>{
      const card=make('article','');
      card.append(make('span',doc.category,'tag'),make('h3',doc.title),make('p',doc.id+' · '+doc.edition,'muted'),officialLink(doc));
      return card;
    }));
    status.textContent='Catalogue des actes';
    return;
  }
  const lexical=ranked.filter(item=>item.score>0);
  let selected=lexical.slice(0,5).map(item=>item.row);
  let modeLabel='Recherche lexicale';
  byId('eu-search').disabled=true;
  try{
    if(mode==='hybrid'){
      status.textContent='Calcul des représentations neuronales…';
      const shortlist=ranked.slice(0,24).map(item=>item.row);
      const data=await euPost('embed',query,shortlist);
      selected=shortlist.map((row,i)=>({row,score:data.scores[i]+0.15*(1-i/shortlist.length)}))
        .sort((a,b)=>b.score-a.score).slice(0,5).map(item=>item.row);
      modeLabel='Recherche hybride · '+data.model;
    }
  }catch(error){modeLabel=error.message+' Résultats lexicaux affichés.';}
  finally{byId('eu-search').disabled=false;}
  euResults=selected;
  showEU(selected);
  status.textContent=modeLabel+' · '+selected.length+' extrait(s).';
};
byId('eu-ask').onclick=async()=>{
  const question=byId('eu-query').value.trim(),status=byId('eu-ai-status');
  const result=byId('eu-answer');
  byId('eu-ask').disabled=true;byId('eu-search').disabled=true;
  result.replaceChildren();status.textContent='Analyse des extraits en cours…';
  try{
    const data=await euPost('answer',question,euResults);
    const allowed=new Set(data.sources.map(source=>source.ref));
    const cited=[...data.answer.matchAll(/\[(S\d+)\]/g)].map(match=>match[1]);
    const complete=cited.length&&cited.every(ref=>allowed.has(ref));
    status.textContent=complete?'Références reconnues. Vérifiez les affirmations dans les extraits.':'Citations absentes ou non reconnues. Vérifiez la réponse.';
    result.append(make('span',data.model+' · Brouillon IA','tag'),make('p',data.answer,'answer'));
    for(const source of data.sources){
      const details=make('details','');
      details.append(make('summary',source.ref+' · '+source.acte+' · '+source.section),make('blockquote',source.text),officialLink(source));
      result.append(details);
    }
  }catch(error){status.textContent=error.message;}
  finally{byId('eu-ask').disabled=false;byId('eu-search').disabled=false;}
};
byId('eu-query').maxLength=1000;
byId('eu-query').onkeydown=e=>{if(e.key==='Enter'&&!byId('eu-search').disabled)byId('eu-search').click();};
byId('eu-search').click();
