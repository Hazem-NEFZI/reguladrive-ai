import json, re
from pathlib import Path
from lxml import html

catalog = [
('reg_2019_2144','32019R2144','Sécurité générale des véhicules','Sécurité / mécanique / électrique','freinage braking direction steering pneus tyres éclairage lighting crash chocs protection piétons ADAS EMC CEM electromagnetic cybersecurity cybersécurité logiciel software électrique electric'),
('reg_2018_858','32018R0858','Réception et surveillance du marché','Homologation','type approval homologation conformité production market surveillance véhicule catégorie rappels recalls'),
('reg_2024_1257','32024R1257','Euro 7 — émissions et durabilité','Environnement / électrique','émissions exhaust frein brake particules particles abrasion tyres batterie battery durability'),
('reg_2023_1542','32023R1542','Batteries et déchets de batteries','Électrique / cycle de vie','batterie battery électrique electric empreinte carbone carbon footprint recycling recyclage passeport passport'),
('reg_2015_758','32015R0758','Appel d’urgence embarqué eCall','Électrique / connectivité','ecall 112 emergency urgence données privacy'),
('reg_540_2014','32014R0540','Niveau sonore et systèmes silencieux','Mécanique / bruit','bruit noise sound exhaust échappement silencieux avas'),
('dir_2000_53','32000L0053','Véhicules hors d’usage','Cycle de vie','fin de vie end of life recyclage recycling démontage dismantling'),
('dir_2014_45','32014L0045','Contrôle technique périodique','Mécanique / sécurité','contrôle technique roadworthiness inspection frein suspension direction essieu corrosion'),
('reg_2020_740','32020R0740','Étiquetage des pneumatiques','Mécanique / environnement','pneus tyres wet grip adhérence rolling resistance résistance roulement bruit noise'),
('reg_2019_631','32019R0631','Normes de performance CO₂','Environnement','CO2 carbone carbon voitures utilitaires cars vans flotte fleet'),
]
catalog += [
('gsr2026','02019R2144-20260802','Sécurité générale — texte consolidé au 02.08.2026','Sécurité / mécanique / électrique','freinage direction pneus éclairage chocs ADAS CEM EMC cybersécurité logiciel électrique'),
('un10','42022X2263','ONU R10 — Compatibilité électromagnétique','Électrique / CEM','CEM EMC électrique immunité perturbations émissions électromagnétiques'),
('un100','42021X2190','ONU R100 — Sécurité électrique et batterie de traction','Électrique / sécurité','haute tension électrique traction batterie REESS choc isolation'),
('un155','42021X0387','ONU R155 — Cybersécurité du véhicule','Cybersécurité','cybersécurité cyberattaque CSMS menace risque véhicule connecté'),
('un156','42021X0388','ONU R156 — Mises à jour logicielles','Logiciel / sécurité','logiciel mises à jour OTA SUMS software update'),
]
docs=[]
def clean(s):return ' '.join(s.split())
def pieces(lines):
    result=[]; buffer=''
    for line in lines:
        for part in re.findall(r'.{1,1100}(?:\s|$)|.{1,1100}', line):
            part=part.strip()
            if not part:continue
            if len(buffer)+len(part)>1450 and buffer:
                result.append(buffer);buffer=''
            buffer=(buffer+'\n'+part).strip()
    if buffer:result.append(buffer)
    return result
for key,celex,title,category,tags in catalog:
    src=None
    for ext,lang in [('fr','FR'),('html','EN')]:
        path=Path('raw')/(key+'.'+ext)
        if not path.exists():continue
        tree=html.parse(str(path))
        root=tree.xpath('//*[@id="document1"]') or (tree.xpath('//body') if tree.xpath('//*[contains(@class,"eli-container") or contains(@class,"norm")]') else [])
        if root and len(clean(root[0].text_content()))>1500:
            src=root[0];break
    if src is None:continue
    base='https://eur-lex.europa.eu/eli/'+key.replace('_','/')+'/oj/'+('fra' if lang=='FR' else 'eng')
    if key.startswith('un') or key=='gsr2026':
        base='https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:'+celex
    sections=[]
    nodes=src.xpath('.//*[starts-with(@id,"art_") or starts-with(@id,"anx_")]')
    for n in nodes:
        anchor=n.get('id')
        if re.fullmatch(r'art_\d+[a-z]?|anx_[IVXLCDM]+',anchor) is None:continue
        heading=next((clean(x.text_content()) for x in n.xpath('./div[contains(@class,"eli-title")]') if clean(x.text_content())), '')
        label=('Article '+anchor[4:] if anchor.startswith('art_') else 'Annexe '+anchor[4:]) + (' · '+heading if heading else '')
        lines=[]
        for node in n.xpath('.//tr | .//p[not(ancestor::tr)]'):
            value=clean(node.text_content())
            if value:lines.append(value)
        if lines:sections.append((label,base+'#'+anchor,lines))
    if not sections:
        node=next(iter(src.xpath('.//*[@id="TexteOnly"]')),src)
        lines=[]
        label='Texte publié'
        for p in node.xpath('.//p[not(descendant::p)] | .//tr'):
            line=clean(p.text_content())
            if not line:continue
            if re.fullmatch(r'(?:Article\s+\d+[a-z]?|ANNEX(?:E)?\s+[IVXLCDM]+)',line,re.I):
                if lines:sections.append((label,base,lines))
                label=line;lines=[]
            lines.append(line)
        if lines:sections.append((label,base,lines))
    passages=[dict(section=label,url=url,text=chunk) for label,url,lines in sections for chunk in pieces(lines)]
    if passages:docs.append(dict(id=celex,title=title,category=category,tags=tags,url=base,language=lang,edition=('Consolidation datée du 02.08.2026' if key=='gsr2026' else 'Version publiée au JO'),passages=passages))
Path('data/eurlex.js').write_text('const EU_ACTS = '+json.dumps(docs,ensure_ascii=False,separators=(',',':'))+';\n')
print([(d['id'],d['language'],len(d['passages'])) for d in docs])
