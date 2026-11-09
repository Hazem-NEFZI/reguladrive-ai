# RegulaDrive AI

**Atelier de veille et de revue réglementaire automobile**  
Hazem Nefzi · Prototype portfolio indépendant

Rechercher une clause, comparer ses versions, demander une synthèse avec sources, puis transmettre une fiche à un spécialiste. Démonstration en français inspirée de l’offre Stellantis 2026-19700.

> Les trois cas fournis sont fictifs. Une fiche « Revu » signale une revue humaine dans l’outil et ne constitue pas une décision d’homologation.

Les sept onglets donnent accès à la vue d’ensemble, à EUR-Lex, au corpus, à l’import, au comparateur, à l’assistant IA et au suivi. Les flèches permettent de naviguer entre les onglets au clavier. Seul le panneau ouvert défile si son contenu dépasse l’écran.

## Corpus officiel EUR-Lex

L’onglet **EUR-Lex** contient **15 entrées et 2 254 passages** en français, extraits d’actes et de règlements ONU publiés sur EUR-Lex. Les identifiants CELEX, l’édition et les liens officiels sont inclus. Les cas fictifs restent dans un onglet séparé.

| Domaine | Textes indexés |
| --- | --- |
| Homologation et surveillance | UE 2018/858 |
| Sécurité, freinage, direction, éclairage et protection des occupants | UE 2019/2144, texte publié et consolidation du 2 août 2026 |
| Compatibilité électromagnétique et sécurité électrique | ONU R10 et R100 |
| Cybersécurité, logiciel et eCall | ONU R155 et R156, UE 2015/758 |
| Émissions, particules et durabilité | Euro 7 (UE 2024/1257), CO₂ (UE 2019/631) |
| Bruit et pneumatiques | UE 540/2014 et 2020/740 |
| Batteries, recyclage et contrôle technique | UE 2023/1542, directives 2000/53/CE et 2014/45/UE |

**Recherche lexicale** disponible hors ligne. **Recherche hybride** : le moteur lexical sélectionne jusqu’à 24 passages, puis un réseau neuronal multilingue les reclasse par similarité cosinus avec la question. Le reclassement ne peut pas retrouver un passage absent de la sélection initiale. Pour l’activer avec Ollama :

```powershell
ollama pull bge-m3
```

L’assistant peut ensuite générer une réponse à partir des cinq extraits affichés, avec références et liens. Le modèle d’embedding et le modèle de génération sont distincts. Le prototype réutilise des modèles préentraînés. Les tests simulent leurs réponses.

**À vérifier sur EUR-Lex** : version en vigueur, catégories de véhicules, dates, séries d’amendements ONU, exceptions, unités et tableaux originaux. L’index est une sélection d’extraits textuels, sans figures et sans mise en page normative. Il ne couvre pas tous les textes, transpositions nationales ni actes d’exécution. Une consolidation est un outil documentaire. Les liens sources renvoient à l’édition utilisée.

**Attribution** : Union européenne, EUR-Lex, et règlements ONU publiés au Journal officiel de l’Union européenne. Les textes officiels conservent leurs conditions de réutilisation et leurs références d’origine. Le script de préparation `tools/build_corpus.py` attend les pages HTML dans `raw/` sous les noms définis dans son catalogue. Il nécessite lxml, uniquement pour reconstruire l’index. L’application livrée utilise l’index préconstruit et ne nécessite pas lxml.

## Démarrage

**Démo immédiate** : extraire le ZIP et ouvrir `index.html`. Le corpus, l’import, le comparateur et le suivi fonctionnent sans modèle.

**Démo avec IA** : installer Python 3 et [Ollama](https://ollama.com/download). Sur Windows, double-cliquer sur `RUN_WINDOWS.bat`. Il démarre Ollama au besoin, télécharge le modèle au premier lancement et ouvre le studio. Garder le terminal ouvert pendant la démo.

**Lancement manuel** : démarrer Ollama puis exécuter depuis le dossier extrait :

```powershell
ollama pull qwen2.5:3b
python server.py
```

Ouvrir **http://127.0.0.1:8765** puis cliquer sur **Vérifier Ollama**. Si Ollama ne tourne pas déjà, lancer `ollama serve` dans un deuxième terminal. Le téléchargement initial du modèle requiert Internet. Sur une machine avec peu de mémoire ou un GPU limité, l’inférence peut être lente. Pour choisir un autre modèle déjà téléchargé, définir `$env:REGULADRIVE_MODEL = "nom:tag"` avant de lancer le serveur.

## Démo en entretien

1. Rechercher **freinage**, puis sélectionner la clause dans les résultats.
2. Comparer les deux versions. Repérer l’ajout des relevés bruts et de la référence logicielle.
3. Ouvrir **Assistant IA**, choisir **Fiche d’impact** et demander « Quelles preuves l’équipe essais doit-elle vérifier ? ».
4. Ouvrir les sources `S1-V1` et `S1-V2` sous la réponse et vérifier les affirmations. Joindre le brouillon au suivi ou l’exporter en JSON.
5. Ouvrir la fiche dans le suivi, passer son statut à **En revue**, ajouter une note de spécialiste, puis exporter le registre avec le brouillon et ses extraits. Pour tester vos propres extraits, importer deux fichiers TXT ou coller deux versions dans le formulaire.

| Fonction | Mise en œuvre |
| --- | --- |
| Recherche | Classement lexical pondéré sur les titres, mots-clés et deux versions |
| Comparaison | Affichage côte à côte et repérage des phrases modifiées |
| IA | Véritable génération via Ollama, sur une ou deux clauses sélectionnées, en quatre modes |
| Traçabilité | Références contrôlées contre les identifiants transmis au modèle, extraits affichés et exportables |
| Suivi | Statuts, notes de revue, brouillons IA et export JSON. Les données restent dans le navigateur si le stockage local est disponible |
| Import | Texte ou fichier TXT, 5 000 caractères par version, stockage local si disponible |

Le contrôle des références vérifie uniquement que les identifiants existent. Un spécialiste doit encore vérifier que chaque extrait justifie l’affirmation. Les fiches des cas fictifs partent de propositions prédéfinies. Un brouillon généré peut être joint à une fiche avec ses sources, pour revue par un spécialiste. La recherche couvre les textes locaux et ne consulte pas le web.

## GitHub

1. Créer un dépôt public nommé **reguladrive-ai**. Laisser la création automatique du README désactivée.
2. Extraire l’archive. Sur GitHub, cliquer sur **uploading an existing file** et déposer le contenu du dossier extrait. Vérifier que `README.md`, `index.html`, `app.js`, `ai.js`, `server.py`, `eu_api.py`, `eurlex.js`, `data/eurlex.js`, `test_server.py` et `RUN_WINDOWS.bat` se trouvent à la racine.
3. Valider avec le message `Add RegulaDrive AI regulatory review studio`. Si `.gitignore` est ignoré lors du téléversement, le créer à la racine et copier les règles du fichier local.
4. Sur la page du dépôt, utiliser **Code → Download ZIP** pour vérifier l’installation depuis une copie propre.

GitHub Pages peut servir l’interface statique. La génération nécessite le serveur Python et Ollama en local. Aucun modèle ni poids n’est inclus dans le dépôt.

## Validation

```bash
python -m unittest -v
node --check app.js
node --check ai.js
```

Les tests Python simulent Ollama et vérifient les échanges HTTP. Ils ne mesurent pas la qualité de génération du modèle.

Pour une validation avec les utilisateurs clés, constituer des cas annotés à partir de documents officiels versionnés et vérifier le rappel des clauses, l’exactitude des citations et le temps de revue. L’intégration à un processus industriel demanderait ensuite une validation métier et un environnement approuvé.
