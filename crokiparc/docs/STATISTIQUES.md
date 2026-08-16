# 📊 Statistiques Croc Parc — comment ça marche

Tout est en place et actif. Ce document explique où regarder, ce qui a été
branché, et **la seule vérification qu'il reste à faire sur le terrain**.

---

## Où lire les statistiques

**Google Sheet « Croc Parc — Statistiques »**
<https://docs.google.com/spreadsheets/d/1C4zTFVZAUDOc4WigIsGHOMpIAZOxyXhuciFNyl0wg0g/edit>

Propriétaire : `asso.collectif.ensemble@gmail.com`.

Deux onglets :

| Onglet | À quoi il sert |
|---|---|
| **Résumé** | Le coup d'œil quotidien. Une ligne par jour, du plus récent au plus ancien : visites, parcours terminés, taux de réussite, durée moyenne. Tout est calculé automatiquement. |
| **Journal** | Le détail brut, une ligne par événement. C'est lui qui se remplit ; le Résumé en découle. |

Colonnes du Journal : `Date · Heure · Session · Événement · Étape · Réponse
donnée · Correct · Temps (s) · Détails`. L'heure est en heure de **La Réunion**.
La colonne `Session` regroupe les lignes d'un même enfant.

> ⚠️ Ne pas toucher aux formules de la ligne 2 de l'onglet Résumé, ni renommer
> l'onglet `Journal` : c'est ce nom exact que le robot va chercher pour écrire.

---

## Le chemin complet

```
téléphone de l'enfant
      │  POST (formulaire, mode no-cors)
      ▼
https://hook.eu1.make.com/itle3bh63ia4j9tx2ui7wwldnyff9u0v
      │
      ▼
scénario Make « Croc Parc — Statistiques »  (actif)
      │  Google Sheets → Add a Row
      ▼
onglet « Journal »  →  onglet « Résumé » (formules)
```

L'adresse est gravée dans `js/config.js` → `webhookUrl`.

---

## Ce qui est envoyé (et ce qui ne l'est pas)

`js/config.js` → `webhookEvents` décide de ce qui part sur le réseau :

```js
webhookEvents: ["session_start", "reponse", "session_complete"],
```

- `session_start` → une ligne par parcours démarré = **une visite**
- `reponse` → une ligne par réponse d'enfant, **bonne ou mauvaise**, avec le
  temps de réflexion. C'est ce qui permet de voir quelle question bloque.
- `session_complete` → une ligne par parcours terminé, avec la durée totale.
  Elle part **dès que l'énigme finale est résolue**. Auparavant elle attendait
  un clic sur « J'ai été voir l'animateur » que les enfants ne faisaient
  presque jamais — les parcours terminés étaient donc largement sous-comptés.

**Tous les autres événements** (`app_ouverte`, `stage_enter`, `stage_complete`,
`puzzle_tentative`, `session_reprise`) continuent d'être enregistrés **en local**
sur le téléphone et restent visibles dans ⚙️ Réglages → Bilan. Ils ne sont
simplement pas transmis, parce qu'ils n'apportent rien de plus au tableau et
qu'ils tripleraient la consommation Make.

Pour tout envoyer malgré tout : mettre `webhookEvents: []` (liste vide = tout).

### Combien de parcours le forfait Make encaisse-t-il ?

Le forfait **Core** du compte = 10 000 opérations/mois, partagées avec les
autres scénarios déjà en place. Un parcours complet d'enfant consomme
**environ 18 à 24 opérations** (chaque événement coûte 2 opérations : le
webhook + l'écriture de la ligne).

→ de l'ordre de **400 à 550 parcours par mois**.

Si le parc dépasse ce rythme, deux options :
1. Réduire `webhookEvents` à `["session_start", "session_complete"]`
   (≈ 4 opérations par parcours, soit ~2 500 parcours/mois) — on perd le détail
   par question ;
2. Basculer sur **Google Apps Script**, gratuit et sans limite :
   tout est prêt dans `docs/statistiques-apps-script.gs`, la marche à suivre est
   en haut du fichier. Le format d'envoi est identique, il n'y a qu'une URL à
   changer.

---

## ✅ La vérification qui reste à faire

Le chemin `Make → Google Sheet` a été testé et fonctionne (une ligne de test a
bien été écrite dans l'onglet Journal puis effacée). Le parcours de l'application
a été testé de bout en bout, et l'envoi qu'elle produit a été inspecté ligne par
ligne.

En revanche, **le maillon « téléphone → Make » n'a pas pu être testé d'ici** :
la machine qui a fait ce travail n'a pas le droit de sortir vers
`hook.eu1.make.com`. Il faut donc le confirmer une fois sur le terrain :

1. Ouvrir l'application en ligne sur un téléphone.
2. Appuyer sur « C'est parti », puis répondre à **une** question.
3. Ouvrir le Google Sheet, onglet **Journal**.
4. Deux lignes doivent apparaître en quelques secondes : `session_start`
   puis `reponse`.

**Si rien n'apparaît**, ouvrir <https://eu1.make.com> → scénario
« Croc Parc — Statistiques » → onglet **Historique** : chaque appel reçu y est
listé avec ce que Make en a compris. C'est là que se lit la cause.

---

## Bon à savoir

- L'adresse du webhook est forcément visible dans le code de l'application (une
  app 100 % statique ne peut rien cacher). Quelqu'un qui la trouverait pourrait
  y envoyer de fausses lignes. Sans conséquence ici, mais si le Journal se
  remplissait un jour de n'importe quoi, il suffit de créer un nouveau webhook
  dans Make et de mettre la nouvelle adresse dans `config.js`.
- Les envois utilisent `navigator.sendBeacon` en priorité : la statistique part
  même si l'enfant range le téléphone dans la seconde.
- Un échec d'envoi est silencieux et sans effet sur le jeu : le parcours de
  l'enfant passe toujours avant la statistique.
- **Après toute modification d'un fichier, incrémenter `CACHE_VERSION` dans
  `sw.js`**, sinon les téléphones gardent l'ancienne version en cache.
