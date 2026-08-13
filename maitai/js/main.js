/* ==========================================================================
   LE MAÏ-TAÏ BY CROC PARC — COMPORTEMENTS
   Vanilla JS, sans dépendance. Tout est progressif : sans JS, le site reste
   entièrement lisible et le bouton d'appel reste fonctionnel.
   ========================================================================== */

(function () {
  "use strict";

  var reduitLeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     1. HORAIRES — source unique de vérité, partagée avec le JSON-LD.
     Fuseau du restaurant : Indian/Reunion (UTC+4), quel que soit le visiteur.
     0 = dimanche … 6 = samedi. Fermé le lundi (1).
     --------------------------------------------------------------------- */
  var HORAIRES = {
    // service du midi uniquement
    ouverture: 11 * 60 + 30,   // 11h30
    fermeture: 14 * 60,        // 14h00
    joursOuverts: [0, 2, 3, 4, 5, 6],        // mardi → dimanche
    joursOuvertsVacances: [0, 1, 2, 3, 4, 5, 6] // 7j/7 pendant les vacances scolaires
  };

  function heureALaReunion() {
    var f = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Indian/Reunion",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    });
    var parties = {};
    f.formatToParts(new Date()).forEach(function (p) { parties[p.type] = p.value; });
    var jours = { dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6 };
    var cle = (parties.weekday || "").toLowerCase().slice(0, 3).replace(".", "");
    return {
      jour: jours[cle],
      minutes: parseInt(parties.hour, 10) * 60 + parseInt(parties.minute, 10)
    };
  }

  function majPastilleOuverture() {
    var pastille = document.querySelector("[data-pastille-ouverture]");
    if (!pastille) return;
    var t = heureALaReunion();
    if (t.jour === undefined || isNaN(t.minutes)) return;

    var ouvertAujourdhui = HORAIRES.joursOuverts.indexOf(t.jour) !== -1;
    var ouvert = ouvertAujourdhui && t.minutes >= HORAIRES.ouverture && t.minutes < HORAIRES.fermeture;
    var libelle;

    if (ouvert) {
      libelle = "Service en cours — jusqu'à 14h";
    } else if (ouvertAujourdhui && t.minutes < HORAIRES.ouverture) {
      libelle = "Ouvre aujourd'hui à 11h30";
    } else if (t.jour === 1) {
      libelle = "Fermé le lundi — hors vacances scolaires";
    } else {
      libelle = "Service du midi terminé";
    }

    pastille.setAttribute("data-etat", ouvert ? "ouvert" : "ferme");
    pastille.querySelector("[data-pastille-texte]").textContent = libelle;
    pastille.hidden = false;
  }

  /* ---------------------------------------------------------------------
     2. EN-TÊTE : devient opaque dès qu'on quitte le hero, se rétracte
     quand on descend vite (on rend l'écran au contenu sur mobile).
     --------------------------------------------------------------------- */
  var entete = document.querySelector("[data-entete]");
  var barreAppel = document.querySelector("[data-barre-appel]");
  var hero = document.querySelector("[data-hero]");
  var dernierY = window.scrollY;

  function surDefilement() {
    var y = window.scrollY;
    var seuil = hero ? hero.offsetHeight * 0.72 : 400;

    if (entete) {
      entete.classList.toggle("est-pose", y > 40);
      // On ne masque l'en-tête que loin du haut, et jamais si un menu est ouvert
      var descend = y > dernierY && y > seuil;
      if (!document.body.classList.contains("menu-ouvert")) {
        entete.classList.toggle("est-cache", descend);
      }
    }
    if (barreAppel) {
      barreAppel.classList.toggle("est-visible", y > seuil * 0.55);
    }
    dernierY = y;
  }

  var tickDefilement = false;
  window.addEventListener("scroll", function () {
    if (tickDefilement) return;
    tickDefilement = true;
    window.requestAnimationFrame(function () {
      surDefilement();
      tickDefilement = false;
    });
  }, { passive: true });

  /* ---------------------------------------------------------------------
     3. MENU MOBILE : ouverture en cercle, piège de focus simple.
     --------------------------------------------------------------------- */
  var burger = document.querySelector("[data-burger]");
  var navMobile = document.querySelector("[data-nav-mobile]");

  function basculerMenu(forcer) {
    if (!burger || !navMobile) return;
    var ouvert = typeof forcer === "boolean" ? forcer : burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(ouvert));
    navMobile.classList.toggle("est-ouvert", ouvert);
    navMobile.setAttribute("aria-hidden", String(!ouvert));
    document.body.classList.toggle("menu-ouvert", ouvert);
    document.body.style.overflow = ouvert ? "hidden" : "";
    if (ouvert) {
      entete && entete.classList.remove("est-cache");
      // Cascade d'apparition des liens
      navMobile.querySelectorAll(".nav-mobile__lien").forEach(function (lien, i) {
        lien.style.transitionDelay = (reduitLeMouvement ? 0 : 90 + i * 55) + "ms";
      });
      var premier = navMobile.querySelector("a");
      premier && premier.focus({ preventScroll: true });
    } else {
      burger.focus({ preventScroll: true });
    }
  }

  burger && burger.addEventListener("click", function () { basculerMenu(); });
  navMobile && navMobile.addEventListener("click", function (e) {
    if (e.target.closest("a")) basculerMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-ouvert")) basculerMenu(false);
  });

  /* ---------------------------------------------------------------------
     4. APPARITIONS AU DÉFILEMENT — IntersectionObserver, une seule passe.
     --------------------------------------------------------------------- */
  var aAnimer = document.querySelectorAll("[data-anim]");
  if (reduitLeMouvement || !("IntersectionObserver" in window)) {
    aAnimer.forEach(function (el) { el.classList.add("est-visible"); });
  } else {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        entree.target.classList.add("est-visible");
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    aAnimer.forEach(function (el, i) {
      // Décalage naturel entre éléments frères, plafonné pour rester nerveux
      if (!el.style.getPropertyValue("--delai")) {
        var freres = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : i;
        el.style.setProperty("--delai", Math.min(freres, 5) * 90 + "ms");
      }
      observateur.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     5. NAVIGATION ACTIVE — met en évidence la section visible.
     --------------------------------------------------------------------- */
  var sections = document.querySelectorAll("main section[id]");
  var liensNav = document.querySelectorAll(".nav__lien[href^='#']");
  if (sections.length && liensNav.length && "IntersectionObserver" in window) {
    var espion = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        liensNav.forEach(function (lien) {
          lien.setAttribute("aria-current", String(lien.getAttribute("href") === "#" + entree.target.id));
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { espion.observe(s); });
  }

  /* ---------------------------------------------------------------------
     6. PARALLAXE TRÈS LÉGÈRE sur le hero — désactivée si mouvement réduit
     ou sur petits écrans (coût inutile, gain visuel nul en portrait).
     --------------------------------------------------------------------- */
  var mediaHero = document.querySelector("[data-parallaxe]");
  if (mediaHero && !reduitLeMouvement && window.matchMedia("(min-width: 760px)").matches) {
    var tickParallaxe = false;
    window.addEventListener("scroll", function () {
      if (tickParallaxe) return;
      tickParallaxe = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          mediaHero.style.transform = "translate3d(0," + (y * 0.18).toFixed(1) + "px,0)";
        }
        tickParallaxe = false;
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     7. Point d'extension : réservation en ligne.
     Quand le module sera prêt, il suffira de remplacer le corps de cette
     fonction (voir README → « Brancher la réservation en ligne »).
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-reservation-bientot]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var cible = document.querySelector("#reserver");
      cible && cible.scrollIntoView({ behavior: reduitLeMouvement ? "auto" : "smooth" });
    });
  });

  /* ---------------------------------------------------------------------
     8. Mesure des appels — le vrai KPI du site.
     Aucun outil d'analytics n'est installé pour l'instant (aucune donnée
     n'est envoyée nulle part, aucun cookie). Ce point d'accroche envoie
     simplement l'événement si un jour gtag / plausible / matomo est ajouté.
     Voir README → « Brancher la mesure d'audience ».
     --------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (lien) {
    lien.addEventListener("click", function () {
      var origine = lien.getAttribute("data-origine-appel") || "inconnue";
      if (typeof window.gtag === "function") {
        window.gtag("event", "appel_telephone", { origine: origine });
      }
      if (window.plausible) { window.plausible("Appel téléphone", { props: { origine: origine } }); }
      if (window._paq) { window._paq.push(["trackEvent", "Contact", "Appel téléphone", origine]); }
    });
  });

  /* ---------------------------------------------------------------------
     9. Année du copyright — pour ne pas avoir à y penser chaque janvier.
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-annee]").forEach(function (el) {
    el.textContent = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Indian/Reunion", year: "numeric"
    }).format(new Date());
  });

  /* --------------------------------------------------------------------- */
  majPastilleOuverture();
  surDefilement();
  document.documentElement.classList.add("js-actif");
})();
