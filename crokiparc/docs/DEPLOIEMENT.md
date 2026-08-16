# 🚀 Mettre l'application en ligne — pas à pas

## L'ordre compte

**1. Déployer. 2. Tester le webhook.** Dans cet ordre.

La version actuellement en ligne ne connaît pas encore l'adresse des
statistiques : elle a été mise en ligne avant que le webhook existe. Tester
maintenant ne montrerait rien et laisserait croire que c'est cassé. Il faut
d'abord déployer la nouvelle version, ensuite seulement tester.

---

## Étape 1 — Récupérer le dossier

Télécharger l'archive de la branche :

<https://github.com/assocollectifensemble-sys/Croc-parc/archive/refs/heads/claude/croc-parc-tour-app-8l0dte.zip>

Décompresser. On obtient un dossier `Croc-parc-claude-croc-parc-tour-app-8l0dte`
qui contient plusieurs choses :

```
Croc-parc-claude-croc-parc-tour-app-8l0dte/
├── crokiparc/     ← 🎯 C'EST CELUI-LÀ, et lui seul
├── maitai/            (le site du restaurant, rien à voir)
└── .github/           (technique)
```

> ⚠️ **Bêtise n°1 — la plus fréquente.** Ne pas déposer le dossier décompressé
> en entier. Netlify chercherait `index.html` à sa racine, ne le trouverait pas,
> et le site afficherait une page blanche ou une erreur 404.
> **On dépose uniquement le dossier `crokiparc`.**
> Pour vérifier avant de déposer : en ouvrant `crokiparc`, on doit voir
> `index.html` directement dedans.

---

## Étape 2 — Déposer sur Netlify

> ⚠️ **Bêtise n°2.** Ne pas passer par `app.netlify.com/drop` : cette page crée
> un **nouveau** site, avec une **nouvelle adresse**. L'ancienne adresse
> continuerait de servir l'ancienne version.

Le bon chemin, pour remplacer le site existant :

1. <https://app.netlify.com> → se connecter.
2. Cliquer sur le site **crocparc** dans la liste.
3. Onglet **Deploys**.
4. Glisser le dossier `crokiparc` dans la zone de dépôt en bas de la page
   (« Drag and drop your site output folder here »).
5. Attendre le passage en « Published » (quelques secondes).

L'adresse <https://crocparc.netlify.app> reste la même.

---

## Étape 3 — Vérifier que la nouvelle version est bien en ligne

Le doute est légitime : l'application se met en cache sur les téléphones, on
peut croire avoir déployé alors qu'on regarde encore l'ancienne version.

**Le test qui ne trompe pas :**

1. Ouvrir <https://crocparc.netlify.app>.
2. Appuyer sur l'engrenage ⚙️ en haut à gauche de l'écran d'accueil.
3. Code : **3108**.
4. Descendre jusqu'à « Adresse de collecte des statistiques ».

- Le champ affiche `https://hook.eu1.make.com/…` → ✅ nouvelle version en ligne.
- Le champ est **vide** → ❌ c'est encore l'ancienne : le dépôt n'a pas pris,
  ou le téléphone sert sa copie en cache.

**Si c'est encore l'ancienne alors que Netlify dit « Published »** : fermer
complètement l'application ou l'onglet (pas juste revenir en arrière), puis
rouvrir. Au besoin, recharger deux fois. C'est le Service Worker qui lâche sa
copie.

---

## Étape 4 — Tester le webhook, pour de vrai

Ce test n'a jamais pu être fait depuis la machine de développement : elle n'a
pas le droit de sortir vers `hook.eu1.make.com`. C'est le dernier maillon à
confirmer.

1. Sur un téléphone, ouvrir l'application et faire **un parcours complet**
   (les 7 étapes puis l'énigme). Ça prend deux minutes en répondant vite.
2. Ouvrir le Google Sheet, onglet **Journal** :
   <https://docs.google.com/spreadsheets/d/1C4zTFVZAUDOc4WigIsGHOMpIAZOxyXhuciFNyl0wg0g/edit>
3. Des lignes doivent apparaître en quelques secondes : `session_start`,
   plusieurs `reponse`, puis `session_complete`.
4. Onglet **Résumé** : une ligne à la date du jour, avec 1 visite et
   1 parcours terminé.

**Si rien n'arrive** : <https://eu1.make.com> → scénario
« Croc Parc — Statistiques » → onglet **Historique**. Chaque appel reçu y est
listé avec ce que Make en a compris. La cause se lit là.

### Effacer les lignes de test

Ce parcours de test compte comme une vraie visite. Pour repartir propre :
sélectionner ses lignes dans l'onglet **Journal**, clic droit → supprimer les
lignes. L'onglet Résumé se recalcule tout seul. Ne jamais supprimer la
**ligne 1** (les en-têtes) ni les formules de la **ligne 2** du Résumé.

---

## Les liens et codes, au même endroit

| Quoi | Où |
|---|---|
| Le site | <https://crocparc.netlify.app> |
| Les statistiques | [Google Sheet « Croc Parc — Statistiques »](https://docs.google.com/spreadsheets/d/1C4zTFVZAUDOc4WigIsGHOMpIAZOxyXhuciFNyl0wg0g/edit) |
| Le robot qui remplit le Sheet | <https://eu1.make.com> → scénario « Croc Parc — Statistiques » |
| Adresse du webhook | `https://hook.eu1.make.com/itle3bh63ia4j9tx2ui7wwldnyff9u0v` |
| Code des réglages ⚙️ | **3108** (le même pour tout le monde) |
| Le code source | [branche `claude/croc-parc-tour-app-8l0dte`](https://github.com/assocollectifensemble-sys/Croc-parc/tree/claude/croc-parc-tour-app-8l0dte) |

---

## Si tu modifies un fichier toi-même

Une seule règle, mais impérative : **incrémenter `CACHE_VERSION` dans `sw.js`**
(`crokiparc-v21` → `crokiparc-v22`, etc.) avant de redéployer. Sans ça, les
téléphones qui ont déjà ouvert l'application gardent l'ancienne version en
cache et ne verront jamais la modification.
