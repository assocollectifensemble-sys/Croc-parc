/* ============================================================
   SCENE.JS — Décor immersif : fonds, motifs flottants, effets
   ============================================================ */

const CrokiScene = (() => {
  const bgEl = () => document.getElementById("scene-bg");
  const motifsEl = () => document.getElementById("scene-motifs");
  const particlesEl = () => document.getElementById("particles");

  function hexToRgba(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function applyGradient(couleur) {
    bgEl().style.background =
      `radial-gradient(ellipse at 50% -10%, ${hexToRgba(couleur, .4)} 0%, #eafcef 45%, #cdeed8 100%)`;
  }

  function setMotifs(emojis) {
    const wrap = motifsEl();
    wrap.innerHTML = "";
    const positions = [
      { top: "8%", left: "6%" }, { top: "18%", left: "78%" },
      { top: "62%", left: "4%" }, { top: "70%", left: "82%" },
      { top: "40%", left: "88%" }, { top: "50%", left: "-2%" }
    ];
    let i = 0;
    emojis.forEach(emoji => {
      for (let rep = 0; rep < 2; rep++) {
        const pos = positions[i % positions.length]; i++;
        const span = document.createElement("span");
        span.className = "motif";
        span.textContent = emoji;
        span.style.top = pos.top;
        span.style.left = pos.left;
        span.style.animationDelay = (i * 1.3) + "s";
        span.style.fontSize = (46 + (i % 3) * 14) + "px";
        wrap.appendChild(span);
      }
    });
  }

  function setForStage(stage) {
    applyGradient(stage.couleur);
    setMotifs(stage.motifs || [stage.emoji]);
  }

  function setDefault() {
    applyGradient("#4aa36a");
    setMotifs(["🌿", "🌺", "🦋", "🌴"]);
  }

  function setFinal() {
    applyGradient("#ffb443");
    setMotifs(["🎉", "🎊", "✨", "🎈"]);
  }

  /* ---------------- Particules ambiantes (lucioles) ---------------- */
  let particleTimer = null;
  function spawnParticle() {
    const wrap = particlesEl();
    if (!wrap) return;
    const p = document.createElement("div");
    p.className = "particle";
    const size = 3 + Math.random() * 5;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = (6 + Math.random() * 6) + "s";
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 13000);
  }
  function startParticles() {
    if (particleTimer) return;
    particleTimer = setInterval(spawnParticle, 900);
    for (let i = 0; i < 4; i++) setTimeout(spawnParticle, i * 250);
  }
  function stopParticles() {
    clearInterval(particleTimer);
    particleTimer = null;
  }

  /* ---------------- Starburst (bonne réponse) ---------------- */
  function starburst() {
    const el = document.createElement("div");
    el.className = "starburst";
    const stars = ["⭐","✨","🌟","💫"];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.textContent = stars[i % stars.length];
      const angle = (i / n) * Math.PI * 2;
      const dist = 90 + Math.random() * 60;
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      s.style.animationDelay = (Math.random() * 0.1) + "s";
      el.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function flashPulse() {
    const el = document.createElement("div");
    el.className = "flash-pulse";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 650);
  }

  /* ---------------- Transition entre étapes ---------------- */
  function showTransition(text, duration = 2800) {
    return new Promise(resolve => {
      const overlay = document.getElementById("transition-overlay");
      document.getElementById("txt-transition").textContent = text;
      overlay.classList.add("show");
      setTimeout(() => {
        overlay.classList.remove("show");
        setTimeout(resolve, 400);
      }, duration);
    });
  }

  return { setForStage, setDefault, setFinal, startParticles, stopParticles, starburst, flashPulse, showTransition };
})();
