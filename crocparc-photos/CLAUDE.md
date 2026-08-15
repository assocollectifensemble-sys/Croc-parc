# Croc Parc Photos — a lire avant de toucher au code

Vente des photos de visite d'un parc animalier a La Reunion. Une photographe
remet une carte a QR a chaque groupe, **photographie cette carte** (c'est le
separateur de session), puis photographie le groupe. Les JPEG partent en FTP
vers un mini-PC Windows au parc ; un pont Python les trie, fabrique des previews
filigranees, les depose sur Cloudflare R2 et declare la session dans D1. Le
visiteur saisit son code a six caracteres, voit ses photos, paie, telecharge ses
originaux.

**Le public est majoritairement compose d'enfants.** Cette phrase n'est pas
decorative : c'est elle qui arbitre la plupart des choix ci-dessous.

## Etat

Les cinq phases sont livrees. 236 tests (140 pytest, 96 vitest). Trois revues de
code ont eu lieu, 33 defauts corriges. Rien n'est encore deploye.

## Les invariants — a ne pas « simplifier »

Chacun de ces points a ete ecrit en reponse a un defaut reel, trouve et
reproduit. Ils paraissent parfois excessifs isolement. Ils ne le sont pas.

1. **Une carte remise en circulation avant 30 jours est mise en quarantaine.**
   Le pont refuse d'ouvrir une seconde session sur un code dont la galerie vit
   encore ; les photos partent en session orpheline. Le visiteur ne possede que
   son code : deux galeries vivantes sous le meme code seraient indemelables, et
   une famille verrait les enfants d'une autre. Une vente perdue vaut mieux.
2. **La galerie ET le paiement refusent tous deux si deux sessions actives
   partagent un code.** Les deux, mot pour mot. Un garde-fou pose d'un seul cote
   laissait acheter ce que l'autre refusait d'afficher.
3. **Pas d'oracle.** Code inconnu, expire, orphelin ou mal forme rendent la meme
   reponse, sur `/api/gallery` comme sur `/api/checkout`. Tout chemin de refus
   compte dans la limitation de debit.
4. **Les cles R2 des previews sont opaques**, derivees de `BRIDGE_SHARED_SECRET`.
   Le bucket est public : une cle derivee de la date et du code s'enumere — et
   pour la session `ORPHAN`, dont le code est documente, sans meme avoir de carte.
5. **Une photo declaree ne change plus jamais de session.** Sinon une reponse
   perdue apres ecriture en base la ferait exister dans deux galeries.
6. **Le prix est recalcule cote serveur**, toujours, a partir des photos
   reellement en base. Le forfait est un plafond, jamais un plancher.
7. **Le delai de grace avant rangement** (120 s) laisse a une carte livree en
   desordre le temps de se presenter. Sans lui, une photo atterrit dans la
   galerie du groupe precedent et n'en sort plus.
8. **La purge balaie R2 par prefixe de date**, pas seulement par jointure sur
   `photos`. Une preview dont la declaration a echoue n'est referencee nulle
   part et resterait en ligne indefiniment.
9. **Les originaux restent au parc** et ne montent sur R2 qu'une fois vendus.
   10 a 20 Mo par photo : les monter systematiquement viderait le palier gratuit
   en deux jours.
10. **Make n'est jamais bloquant.** S'il tombe, la commande reste valide et le
    client telecharge depuis la page de retour.

## Conventions

- Code et commentaires **en francais**, sans accents dans les fichiers Python et
  TypeScript (les accents sont admis dans le Markdown et les textes affiches).
- Les commentaires expliquent **pourquoi**, pas quoi. S'ils decrivent un piege,
  ils disent lequel.
- Pas de framework front, pas de bundler : PWA vanilla.
- `bridge/src/bridge/config.py` et `web/config.js` sont les seules sources de
  verite pour la configuration. Aucune valeur en dur ailleurs.
- Toute correction s'accompagne d'un test qui echoue sans elle.

## Verifier

```bash
cd bridge && python -m pytest -q     # 140 tests, ~2 min 30
npm test                             # 96 tests, ~5 s
npm run typecheck
```

Les tests des Functions tournent contre le **SQL reel des migrations**, adosse
au SQLite natif de Node. Les fixtures JPEG et cartes QR sont fabriquees par les
tests eux-memes ; aucun binaire n'est versionne.

## Ne pas oublier

- Le pont tourne sur **Windows**. Chemins par `pathlib`, cles de file
  normalisees (`os.path.normcase`), fichiers parfois verrouilles par
  l'antivirus ou FileZilla.
- Verifier ses affirmations : ce projet a connu des copies silencieusement
  echouees. `md5sum`, `diff`, et on lit la sortie.
- La mise en ligne est decrite dans `docs/MISE-EN-LIGNE.md`, la reprise de
  session dans `docs/REPRISE-EN-LOCAL.md`.
