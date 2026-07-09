/**
 * supermonteur — build an animated-caption HyperFrames composition from a cam video + Scribe words.
 * Full-screen cam + word-by-word captions with the spoken word highlighted. Clean, readable,
 * social-safe, ready to post.
 *
 *   node build.mjs --cam clip.mp4 --words clip.words.json --out index.html [--accent "#28e0a8"]
 *
 * Then render with hyperframes:  npx hyperframes render . -q high
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]); return a;
}, []));
const cam = args.cam, wordsPath = args.words;
const out = args.out || "index.html";
const accent = args.accent || "#28e0a8";          // active-word colour (change to taste)
if (!cam || !wordsPath) { console.error("usage: --cam <mp4> --words <json> [--out] [--accent]"); process.exit(1); }

const dur = +execSync(`ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${cam}"`).toString().trim();
const W = JSON.parse(readFileSync(wordsPath, "utf8")).words.map(w => ({ t: +w.start, e: +w.end, text: w.text.trim() })).filter(w => w.text);

// group into lines: <=4 words AND <=24 chars, break on sentence end or pause >0.5s
const lines = [];
let cur = [];
for (let i = 0; i < W.length; i++) {
  cur.push(W[i]);
  const chars = cur.reduce((n, w) => n + w.text.length + 1, 0);
  const next = W[i + 1];
  const gap = next ? next.t - W[i].e : 9;
  const endsSent = /[.!?]$/.test(W[i].text);
  if (endsSent || cur.length >= 4 || chars >= 24 || gap > 0.5 || !next) {
    lines.push(cur); cur = [];
  }
}

// caption DOM + timeline ops
let blocksHtml = "", ops = "";
lines.forEach((line, li) => {
  const start = line[0].t, end = Math.min(line[line.length - 1].e + 0.4, (lines[li + 1]?.[0].t ?? dur));
  const words = line.map((w, wi) =>
    `<span class="cw" id="l${li}w${wi}">${w.text.replace(/[<>&]/g, "")}</span>`).join(" ");
  blocksHtml += `<div class="cap" id="l${li}">${words}</div>\n`;
  ops += `tl.set("#l${li}",{opacity:0},0);tl.to("#l${li}",{opacity:1,duration:0.12},${start.toFixed(3)});`
       + `tl.to("#l${li}",{opacity:0,duration:0.12},${end.toFixed(3)});`;
  // active-word highlight
  line.forEach((w, wi) => {
    ops += `tl.set("#l${li}w${wi}",{color:"#fff",scale:1},0);`
         + `tl.to("#l${li}w${wi}",{color:"${accent}",scale:1.0,duration:0.01},${w.t.toFixed(3)});`
         + `tl.to("#l${li}w${wi}",{color:"#fff",duration:0.01},${(w.e + 0.05).toFixed(3)});`;
  });
});

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1920px;background:#000;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
  #root{position:relative;width:1080px;height:1920px;background:#000;overflow:hidden}
  #cam{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  #caps{position:absolute;left:60px;right:60px;top:1230px;text-align:center;z-index:10}
  .cap{position:absolute;left:0;right:0;opacity:0;will-change:opacity}
  .cw{display:inline-block;font-weight:800;font-size:78px;line-height:1.15;color:#fff;letter-spacing:0.5px;
      text-transform:uppercase;text-shadow:0 4px 0 rgba(0,0,0,.65),0 0 22px rgba(0,0,0,.85);
      -webkit-text-stroke:2px rgba(0,0,0,.55);will-change:color,transform}
</style></head>
<body>
  <div id="root" data-composition-id="root" data-start="0" data-duration="${dur.toFixed(2)}" data-width="1080" data-height="1920" data-fps="25">
    <video id="cam" class="clip" src="${cam}" muted playsinline preload="auto" data-start="0" data-duration="${dur.toFixed(2)}" data-track-index="0" data-has-audio="false"></video>
    <audio id="cam-audio" class="clip" src="${cam}" data-start="0" data-duration="${dur.toFixed(2)}" data-track-index="1" data-volume="1"></audio>
    <div id="caps">
      ${blocksHtml}
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({paused:true});
    ${ops}
    tl.to({},{duration:${dur.toFixed(2)}},0);
    window.__timelines["root"] = tl;
  </script>
</body></html>`;

writeFileSync(out, html);
console.log(`${W.length} words · ${lines.length} caption lines · ${dur.toFixed(1)}s -> ${out}`);
