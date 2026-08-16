/* ============================================================
   CONFIG.JS — Données par défaut : les super-pouvoirs du parc
   ============================================================
   ⚠️ PAS DE GPS : suite au vrai test terrain, la géolocalisation
   a été retirée entièrement. Les enfants ont la carte du parc
   (numérotée 1 à 7) sous les yeux en permanence, et avancent
   panneau par panneau en appuyant eux-mêmes sur « Je suis
   arrivé(e) devant le panneau » — c'est ce clic qui déclenche
   la question, jamais une détection automatique de position.

   7 étapes, dans l'ordre de visite (= numéros sur la carte) :
     1. Crocodiles   2. Paons   3. Maki catta   4. Volière
     5. Oies         6. Chèvres 7. Iguane vert

   Chaque bonne réponse rapporte un accessoire de fête ET une
   lettre du mot PARADIS — l'accessoire commence toujours par la
   même lettre que celle gagnée à cette étape :
     1 Crocodiles → P → Paillettes
     2 Paons      → A → Assiettes
     3 Maki catta → R → Rubans
     4 Volière    → A → Ananas
     5 Oies        → D → Diadèmes
     6 Chèvres     → I → Illuminations
     7 Iguane vert → S → Serpentins

   👋 Pas de prénom demandé : Croki interpelle l'enfant par
   « Super Marmaille » tout du long.

   🗣️ Croki parle un mélange de français et de créole réunionnais,
   toujours enjoué.

   🎙️ AUCUNE VOIX ROBOT : tant qu'un texte n'est pas enregistré
   dans ⚙️ Réglages → Banque de voix, l'appli reste silencieuse
   sur ce passage — jamais de synthèse vocale.
   ============================================================ */

const DEFAULT_CONFIG = {

  parc: {
    nom: "CrocParc & Cie",
    lieu: "Étang-Salé, La Réunion 🌴",
    planImage: "assets/img/plan-parc.webp"
  },

  motCible: "PARADIS",
  adminPin: "3108",        // code gravé pour tout le monde — un seul code pour l'application entière

  // Adresse qui reçoit les statistiques de TOUS les visiteurs.
  // Scénario Make « Croc Parc — Statistiques » -> Google Sheet « Croc Parc — Statistiques ».
  // Un récepteur Google Apps Script (docs/statistiques-apps-script.gs) accepte
  // exactement le même envoi : il suffit de coller son URL /exec à la place.
  webhookUrl: "https://hook.eu1.make.com/itle3bh63ia4j9tx2ui7wwldnyff9u0v",

  // Types d'événements réellement envoyés sur le réseau. TOUS les événements
  // restent enregistrés en local (⚙️ Réglages → Bilan) quoi qu'il arrive ;
  // cette liste ne filtre que ce qui part vers le webhook.
  //   - session_start    -> une ligne par parcours démarré (= visite)
  //   - reponse          -> une ligne par réponse d'enfant (bonne ou mauvaise)
  //   - session_complete -> une ligne par parcours terminé, avec sa durée
  // Ces trois-là suffisent à remplir la feuille « Résumé ». Ajouter les autres
  // (stage_enter, stage_complete, app_ouverte, puzzle_tentative,
  // session_reprise) multiplie par ~3 la consommation Make sans rien apporter
  // de neuf. Liste vide = on envoie absolument tout.
  webhookEvents: ["session_start", "reponse", "session_complete"],
  contactEmail: "asso.collectif.ensemble@gmail.com",

  // ---------------------------------------------------------
  // Accueil : une seule page, droit au but, pas de prénom.
  // ---------------------------------------------------------
  histoireAccueil: {
    cle: "histoire_accueil",
    texte: "Coucou Super Marmaille ! Moin lé Croki, lé crocodile le plus rigolo de Croc Parc ! Je prépare une fête surprise pour tous mes amis du parc, et j'ai besoin d'un sacré coup de main… Aou i le vini avec moin ? Active le son de ton téléphone pour bien m'entendre !"
  },

  histoireVideo: {
    cle: "histoire_video",
    texte: "Bienvenue à Croc Parc, Super Marmaille… c'est parti pour l'aventure !"
  },

  carteExplication: {
    cle: "carte_explication",
    texte: "Voici le plan du parc ! Les panneaux sont numérotés de 1 à 7 : suis l'ordre des numéros pour avancer dans le parc. Une fois devant le bon panneau, appuie sur le bouton « Je suis arrivé(e) » pour découvrir la question !"
  },

  stages: [
    {
      id: "crocos",
      nom: "Bassin des Crocodiles",
      emoji: "🐊",
      couleur: "#1a7a6e",
      motifs: ["🐊", "💧", "🌿"],
      accessoire: "Paillettes",
      accessoireEmoji: "🎊",
      crokiImage: "croki-reflechit-pilier",
      transition: "Rendez-vous au panneau n°1, celui des crocodiles du Nil, à toi de le trouver 😉",
      intro: "J'ai besoin de tes yeux de Super Marmaille ! Est-ce que tu as trouvé le panneau où il y a les crocodiles du Nil ? Il y a un super-pouvoir extraordinaire à découvrir chez mon cousin le crocodile…",
      question: {
        texte: "Quel est le super-pouvoir du crocodile du Nil ?",
        options: ["Il peut voler sur de courtes distances 🦅", "Il peut rester près d'une heure sous l'eau sans respirer 🫧", "Il change de couleur comme un caméléon 🦎", "Il peut courir aussi vite qu'une gazelle 🐆"],
        bonne: 1,
        explication: "Eh oui, brav Super Marmaille ! Le crocodile du Nil peut retenir sa respiration et rester immobile sous l'eau pendant presque une heure avant de remonter reprendre son souffle. Un vrai champion d'apnée ! Clique maintenant sur le bouton pour foncer vers le panneau n°2, la clairière des paons !"
      }
    },
    {
      id: "paon",
      nom: "Clairière des Paons",
      emoji: "🦚",
      couleur: "#6a4c93",
      motifs: ["🦚", "🌸", "✨"],
      accessoire: "Assiettes",
      accessoireEmoji: "🍽️",
      crokiImage: "croki-appuye-malin",
      transition: "En route maintenant vers le panneau n°2, la clairière des paons, à toi de la trouver 😉",
      intro: "As-tu trouvé le panneau avec un magnifique paon dessus, marmaille ? Il n'y a pas de trous dans son plumage, chaque plume est à sa place pour impressionner ! Toi seul peux m'aider à percer son secret…",
      question: {
        texte: "Quel est le super-pouvoir du paon ?",
        options: ["Il peut sauter à plus de 1m70 de haut 🦵", "Il peut nager sous l'eau comme un poisson 🐟", "Il change la couleur de ses plumes selon la météo 🌦️", "Il peut voler à plus de 200 km/h 🚀"],
        bonne: 0,
        explication: "Sa lé bon, hein ! Malgré sa lourde traîne de plumes, le paon peut sauter à plus d'1m70 de haut d'un seul bond pour rejoindre les branches et échapper à ses prédateurs ! Appuie sur le bouton pour t'envoler vers le panneau n°3, l'île des makis catta !"
      }
    },
    {
      id: "makis",
      nom: "Île des Makis Catta",
      emoji: "🐒",
      couleur: "#c9962c",
      motifs: ["🐒", "🌴", "⭐"],
      accessoire: "Rubans",
      accessoireEmoji: "🎗️",
      crokiImage: "croki-duo-pense",
      transition: "En route maintenant vers le panneau n°3, l'île des makis catta, à toi de la trouver 😉",
      intro: "Tu es arrivé sur l'île des makis catta, marmaille ? Cherche bien le panneau avec leur photo ! Combien de makis catta vois-tu jouer dans les arbres du parc ? J'ai besoin de ta mémoire de champion pour la prochaine question !",
      question: {
        texte: "Comment s'appelle le dernier maki catta né au CrocParc en 2020 ?",
        options: ["Scarlette", "Bijou", "Nala", "Praline"],
        bonne: 0,
        explication: "Brav toi ! Scarlette est née au CrocParc en 2020. Les makis catta vivent en troupe dirigée par… une femelle ! C'est elle la cheffe du groupe. Clique sur le bouton pour rejoindre le panneau n°4, la volière des inséparables !"
      }
    },
    {
      id: "inseparables",
      nom: "Volière des Inséparables",
      emoji: "🦜",
      couleur: "#e0587a",
      motifs: ["🦜", "💕", "🌺"],
      accessoire: "Ananas",
      accessoireEmoji: "🍍",
      crokiImage: "croki-salut-4pattes",
      transition: "En route maintenant vers le panneau n°4, la volière des inséparables, à toi de la trouver 😉",
      intro: "Écoute-les gazouiller, marmaille ! Cette volière est pleine de petits oiseaux très câlins qu'on appelle les inséparables — ils vivent toujours en couple, comme de bons zamis ! Aide-moi à les compter tous…",
      question: {
        texte: "Combien y a-t-il d'inséparables dans la volière ?",
        options: ["12", "15", "19", "24"],
        bonne: 2,
        explication: "Brav, il y en a 19 ! Et oui, il y a aussi des inséparables tout bleus cachés au milieu des verts — est-ce que tu les as vus ? Les inséparables portent bien leur nom : ils forment des couples pour la vie et restent toujours collés l'un à l'autre. Clique sur le bouton pour continuer vers le panneau n°5, la mare aux oies !"
      }
    },
    {
      id: "oies",
      nom: "Mare aux Oies",
      emoji: "🪿",
      couleur: "#4aa3c7",
      motifs: ["🪿", "☁️", "🌾"],
      accessoire: "Diadèmes",
      accessoireEmoji: "👑",
      crokiImage: "croki-court",
      transition: "En route maintenant vers le panneau n°5, la mare aux oies, à toi de la trouver 😉",
      intro: "Regarde bien autour de toi, Super Marmaille : as-tu repéré le panneau dans le coin où cacardent les oies ? Elles cachent, elles aussi, un super-pouvoir étonnant…",
      question: {
        texte: "Jusqu'à quel âge peut vivre une oie ?",
        options: ["10 ans", "20 ans", "40 ans", "80 ans"],
        bonne: 2,
        explication: "Et oui, jusqu'à 40 ans, lontan sa ! C'est bien plus longtemps que la plupart des oiseaux de basse-cour. Clique sur le bouton pour rejoindre le panneau n°6, l'oasis des chèvres !"
      }
    },
    {
      id: "chevres",
      nom: "l'Oasis des Chèvres",
      emoji: "🐐",
      couleur: "#a8763e",
      motifs: ["🐐", "🌾", "🧺"],
      accessoire: "Illuminations",
      accessoireEmoji: "✨",
      crokiImage: "croki-safari",
      crokiScene: true,
      transition: "En route maintenant vers le panneau n°6, l'oasis des chèvres, à toi de la trouver 😉",
      intro: "Ouuu, i senté bon zot ! Psst, entre nous marmaille : mon coin préféré du parc c'est le mini golf ! Mais aujourd'hui, avant-dernière étape avant la fête : trouve le panneau des chèvres, qui cachent elles aussi un super-pouvoir !",
      question: {
        texte: "Combien d'estomacs possède une chèvre ?",
        options: ["1 seul estomac", "2 estomacs", "3 estomacs", "4 estomacs"],
        bonne: 3,
        explication: "Et oui, 4 estomacs ! La chèvre est un ruminant : ses 4 estomacs (dont la fameuse panse) lui permettent de digérer même l'herbe la plus coriace ! Clique sur le bouton pour grimper jusqu'au panneau n°7, le rocher de l'iguane vert !"
      }
    },
    {
      id: "iguane",
      nom: "Rocher de l'Iguane Vert",
      emoji: "🦎",
      couleur: "#2f8f5b",
      motifs: ["🦎", "🌞", "🪨"],
      accessoire: "Serpentins",
      accessoireEmoji: "🎉",
      crokiImage: "croki-a-toi-de-jouer",
      crokiScene: true,
      transition: "En route maintenant vers le panneau n°7, le rocher de l'iguane vert, à toi de le trouver 😉",
      intro: "Regarde comme il est beau, tout vert et immobile au soleil ! Approche-toi du panneau de l'iguane vert, marmaille : dernière étape avant la fête, lui aussi cache un super-pouvoir surprenant sur sa famille !",
      question: {
        texte: "Combien d'œufs maximum une iguane peut-elle pondre par portée ?",
        options: ["10 œufs", "25 œufs", "60 œufs", "5 œufs"],
        bonne: 2,
        explication: "Assiz aou, jusqu'à 60 œufs d'un coup ! L'iguane verte est une championne de la ponte. Clique sur le bouton pour découvrir la fête, Super Marmaille !"
      }
    }
  ],

  // ---------------------------------------------------------
  // Mini-jeu final : énigme puis reconstitution du mot,
  // lettre par lettre, en vert (bien placée) / rouge (mal placée).
  // ---------------------------------------------------------
  enigmeFinale: {
    cle: "enigme_finale",
    texte: "Croki te pose une dernière énigme, Super Marmaille :\n— Mon premier est ce que tu fais quand tu avances.\n— Mon deuxième est un petit légume rouge et blanc.\n— Mon tout est un endroit merveilleux dont beaucoup rêvent.\nÀ toi d'écrire ce mot avec les lettres que tu as gagnées !"
  },

  // Consigne affichée tout en haut de l'écran de fête : c'est la seule action
  // qui reste à faire dans le vrai monde, elle passe donc avant la célébration.
  vaVoirAnimateur: {
    cle: "va_voir_animateur",
    texte: "Va vite montrer ce mot à l'animateur du jour : il a une surprise pour toi ! 🎁"
  },

  final: {
    titre: "Bienvenue au PARADIS, Super Marmaille !",
    bulle: "Nou lé arrivé, sa lé le paradis ! Grâce à toi, tous mes amis sont réunis et la fête est parfaite. Merci du fond du cœur — viens me rejoindre dans les jeux gonflables !",
    avis: "Un petit avis Google, laissé par un adulte, aide vraiment CrocParc à s'améliorer 🙏",
    crokiImage: "croki-victoire-medaille",
    crokiScene: true
  }
};

const CROKI_IMAGES = [
  "croki-accueil-salut", "croki-reflechit-pilier", "croki-appuye-malin",
  "croki-salut-4pattes", "croki-court", "croki-victoire-peace",
  "croki-hesite", "croki-duo-pense", "croki-espoir-nuage"
];
const CROKI_SCENES = ["croki-a-toi-de-jouer", "croki-safari", "croki-victoire-medaille"];
