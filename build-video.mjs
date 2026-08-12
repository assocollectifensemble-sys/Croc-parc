// Capture l'annonce animée (templates/annonce/video/reel.html) en vidéo,
// puis exporte deux découpes MP4 : Reel (8s, boucle douce sur le CTA) et
// Story (6s, plus rapide). Nécessite ffmpeg dans le PATH.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, 'templates/annonce/video/reel.html');
const RAW_DIR = path.join(__dirname, 'output/video_raw');
const OUT_DIR = path.join(__dirname, 'output');

const CUTS = [
  { name: 'maitai_annonce_reel.mp4', durationMs: 8200 },
  { name: 'maitai_annonce_story-video.mp4', durationMs: 6200 },
];

fs.mkdirSync(RAW_DIR, { recursive: true });

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

  const outPath = path.join(OUT_DIR, cut.name);
  execFileSync('ffmpeg', [
    '-y',
    '-ss', prefixSec.toFixed(2),
    '-i', rawPath,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', (cut.durationMs / 1000).toFixed(2),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outPath,
  ], { stdio: 'inherit' });

  console.log('✓', cut.name, `(prefix ${prefixSec.toFixed(2)}s trimmed)`);
}

await browser.close();
fs.rmSync(RAW_DIR, { recursive: true, force: true });
console.log('\nTerminé.');
