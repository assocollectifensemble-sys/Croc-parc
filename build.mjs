// Build script — exporte chaque visuel HTML/CSS en PNG haute qualité.
// Usage : node build.mjs            (exporte tout)
//         node build.mjs dir1       (exporte seulement les fichiers dont le chemin contient "dir1")
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = [
  // Phase 4 — système de production (direction "Sous la Varangue" retenue)
  // Ces 3 templates x 2 formats sont la source de vérité. Pour publier,
  // éditez les variables en haut de chaque fichier HTML puis relancez ce script.
  { input: 'templates/annonce/carre.html', output: 'output/maitai_annonce_carre.png', width: 1080, height: 1080 },
  { input: 'templates/annonce/story.html', output: 'output/maitai_annonce_story.png', width: 1080, height: 1920 },
  { input: 'templates/menu-du-jour/carre.html', output: 'output/maitai_menu-du-jour_carre.png', width: 1080, height: 1080 },
  { input: 'templates/menu-du-jour/story.html', output: 'output/maitai_menu-du-jour_story.png', width: 1080, height: 1920 },
  { input: 'templates/evenement/carre.html', output: 'output/maitai_evenement_carre.png', width: 1080, height: 1080 },
  { input: 'templates/evenement/story.html', output: 'output/maitai_evenement_story.png', width: 1080, height: 1920 },
];

const filterArg = process.argv[2];
const jobs = filterArg ? TARGETS.filter(t => t.input.includes(filterArg)) : TARGETS;

if (jobs.length === 0) {
  console.error(`Aucune cible ne correspond au filtre "${filterArg}".`);
  process.exit(1);
}

const browser = await chromium.launch();

for (const job of jobs) {
  const inputPath = path.join(__dirname, job.input);
  const outputPath = path.join(__dirname, job.output);
  const page = await browser.newPage({
    viewport: { width: job.width, height: job.height },
    deviceScaleFactor: 1,
  });
  await page.goto('file://' + inputPath);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: outputPath });
  await page.close();
  console.log('✓', job.output);
}

await browser.close();
console.log(`\n${jobs.length} visuel(s) exporté(s).`);
