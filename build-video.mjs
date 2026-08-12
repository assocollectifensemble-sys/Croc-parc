// Capture l'annonce animée (templates/annonce/video/reel.html) en vidéo,
// synthétise une musique de fond originale (donc 100% libre de droit, pas
// une piste "libre de droit" tierce), puis exporte deux découpes MP4 :
// Reel (8s) et Story (6s, tempo plus rapide). Nécessite ffmpeg dans le PATH.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, 'templates/annonce/video/reel.html');
const RAW_DIR = path.join(__dirname, 'output/video_raw');
const OUT_DIR = path.join(__dirname, 'output');

// Petite progression d'accords chaleureuse (C - Am - F - G), arpégée
// façon ukulélé : une note de basse par mesure + 4 notes du triton en
// croches. Entièrement synthétisé — aucune source audio externe.
const CHORDS = {
  C:  { bass: 130.81, upper: [261.63, 329.63, 392.00, 329.63] },
  Am: { bass: 220.00, upper: [440.00, 523.25, 659.25, 523.25] },
  F:  { bass: 174.61, upper: [349.23, 440.00, 523.25, 440.00] },
  G:  { bass: 196.00, upper: [392.00, 493.88, 587.33, 493.88] },
};
const PROGRESSION = ['C', 'Am', 'F', 'G'];

const CUTS = [
  { name: 'maitai_annonce_reel.mp4', durationMs: 8200, barSec: 2.0 },
  { name: 'maitai_annonce_story-video.mp4', durationMs: 6200, barSec: 1.5 },
];

fs.mkdirSync(RAW_DIR, { recursive: true });

function buildNotes(barSec, totalSec) {
  const notes = [];
  let bar = 0;
  for (let t = 0; t < totalSec - 0.01; t += barSec, bar++) {
    const chord = CHORDS[PROGRESSION[bar % PROGRESSION.length]];
    // Le filtre lavfi "sine" ne sort pas à pleine échelle par défaut (~-18dBFS) :
    // ces gains compensent pour obtenir un fond musical réellement audible.
    notes.push({ freq: chord.bass, start: t, dur: Math.min(barSec * 0.7, totalSec - t), gain: 2.8 });
    const offsets = [0.125, 0.375, 0.625, 0.875];
    offsets.forEach((o, i) => {
      const start = t + o * barSec;
      if (start >= totalSec - 0.03) return;
      const dur = Math.min(barSec * 0.28, 0.4, totalSec - start);
      notes.push({ freq: chord.upper[i], start, dur, gain: 1.8 });
    });
  }
  return notes;
}

function synthesizeMusic(barSec, totalSec, outPath) {
  const notes = buildNotes(barSec, totalSec);
  const filters = [];
  const labels = [];
  notes.forEach((n, i) => {
    const decay = Math.max(n.dur * 0.82, 0.03);
    const fadeStart = Math.max(n.dur - decay, 0);
    const delayMs = Math.round(n.start * 1000);
    filters.push(
      `sine=frequency=${n.freq.toFixed(2)}:duration=${n.dur.toFixed(3)}:sample_rate=44100` +
      `,afade=t=in:st=0:d=0.008` +
      `,afade=t=out:st=${fadeStart.toFixed(3)}:d=${decay.toFixed(3)}` +
      `,volume=${n.gain}` +
      `,adelay=delays=${delayMs}:all=1[n${i}]`
    );
    labels.push(`[n${i}]`);
  });
  const mixChain = `${labels.join('')}amix=inputs=${notes.length}:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9[mixed]`;
  const filterComplex = filters.join(';') + ';' + mixChain;

  execFileSync('ffmpeg', [
    '-y',
    '-filter_complex', filterComplex,
    '-map', '[mixed]',
    '-t', totalSec.toFixed(2),
    '-ar', '44100',
    outPath,
  ], { stdio: 'inherit' });
}

const browser = await chromium.launch();

for (const cut of CUTS) {
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: RAW_DIR, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto('file://' + SOURCE);
  // Attend le signal "polices chargées, chronologie prête" posé par la page
  // elle-même plutôt qu'un délai fixe — la durée du chargement réseau des
  // Google Fonts est variable et ne doit pas décaler l'animation capturée.
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  const prefixSec = (Date.now() - t0) / 1000;
  await page.waitForTimeout(cut.durationMs + 300);
  const videoHandle = page.video();
  await context.close();
  const rawPath = await videoHandle.path();

  const totalSec = cut.durationMs / 1000;
  const musicPath = path.join(RAW_DIR, cut.name.replace('.mp4', '_music.wav'));
  synthesizeMusic(cut.barSec, totalSec, musicPath);

  const outPath = path.join(OUT_DIR, cut.name);
  execFileSync('ffmpeg', [
    '-y',
    '-ss', prefixSec.toFixed(2),
    '-i', rawPath,
    '-i', musicPath,
    '-t', totalSec.toFixed(2),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outPath,
  ], { stdio: 'inherit' });

  console.log('✓', cut.name, `(prefix ${prefixSec.toFixed(2)}s trimmed, musique synthétisée)`);
}

await browser.close();
fs.rmSync(RAW_DIR, { recursive: true, force: true });
console.log('\nTerminé.');
