// Throwaway generator (final pass): writes index.html and detail.html from one template.
// Based on attempt a2 ("Layered CSS craft"); reworked per judge notes.
const fs = require('fs');
const path = require('path');
const OUT = __dirname;
const DEBUG = process.env.DEBUG === '1';
// Horizontal condense for card B's long name (measured in-browser once, see DEBUG).
const COND_B = process.env.COND_B || '0.86';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const b64 = s => `url("data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}")`;
const f1 = n => (Math.round(n * 10) / 10).toString();

// ---------- texture tiles ----------
const grainTile = op => b64(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch' seed='11'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0' intercept='1'/></feComponentTransfer></filter><rect width='160' height='160' filter='url(#n)' opacity='${op}'/></svg>`);
const GRAIN = grainTile(0.55), GRAIN_B = grainTile(0.66);
const PAPER = b64(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='p' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='4' stitchTiles='stitch' seed='21'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0' intercept='1'/></feComponentTransfer></filter><rect width='200' height='200' filter='url(#p)' opacity='.6'/></svg>`);
const brushTile = op => b64(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='720'><filter id='b' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.55 0.003' numOctaves='3' stitchTiles='stitch' seed='4'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0' intercept='1'/></feComponentTransfer></filter><rect width='240' height='720' filter='url(#b)' opacity='${op}'/></svg>`);
const BRUSH = brushTile(0.46), BRUSH_B = brushTile(0.2);
const GLITTER = (() => {
  const R = rng(99); let c = '';
  for (let i = 0; i < 110; i++) {
    const r = 0.45 + R() * R() * 1.6;
    c += `<circle cx='${f1(R() * 140)}' cy='${f1(R() * 140)}' r='${f1(r)}' fill='#fff' opacity='${f1(0.35 + R() * 0.65)}'/>`;
  }
  return b64(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>${c}</svg>`);
})();

// ---------- zone mask (frame 1 / plate / art / effect box), in card units ----------
// Layout: padding 4.6 / 7 / 5.66; plate 13.1; art 72.9 (inner inset .95); type 5.8; effect 29.2; strip 7.3.
function zoneMask({ plate = 1, art = .4, effect = .06 }) {
  const H = 145.76;
  const P = { x: 7, y: 4.6, w: 86, h: 13.1 }, A = { x: 7.95, y: 20.85, w: 84.1, h: 71 }, E = { x: 7, y: 101.6, w: 86, h: 29.2 };
  const hole = r => `M${r.x} ${r.y} h${r.w} v${r.h} h-${r.w} z`;
  const fill = (r, o) => o >= 1 ? '' : `<rect x='${r.x}' y='${r.y}' width='${r.w}' height='${r.h}' fill='#fff' fill-opacity='${o}'/>`;
  const holes = [P, A, E].filter((r, i) => [plate, art, effect][i] < 1).map(hole).join(' ');
  return b64(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 ${H}' preserveAspectRatio='none'><path d='M0 0 H100 V${H} H0 Z ${holes}' fill='#fff' fill-rule='evenodd'/>${fill(P, plate)}${fill(A, art)}${fill(E, effect)}</svg>`);
}
const MASK_FOIL = zoneMask({ plate: .9, art: .3, effect: .05 });
const MASK_SHEEN = zoneMask({ plate: .9, art: .45, effect: 0 });
const MASK_SATIN = zoneMask({ plate: .9, art: .35, effect: 0 });
const MASK_GLARE = zoneMask({ plate: 1, art: .8, effect: .25 });

// ---------- ART A: network nocturne ----------
function artA() {
  const R = rng(7), W = 430, H = 364, F = { x: 268, y: 130 };
  const nodes = [];
  for (let i = 0; i < 54; i++) {
    let x, y;
    if (R() < 0.5) { x = F.x + (R() + R() - 1) * 250; y = F.y + (R() + R() - 1) * 210; }
    else { x = R() * W; y = R() * H; }
    x = Math.max(-8, Math.min(W + 8, x)); y = Math.max(-8, Math.min(H + 8, y));
    const d = R();
    nodes.push({ x, y, l: d < 0.42 ? 0 : d < 0.76 ? 1 : 2 });
  }
  const layers = [[], [], []];
  nodes.forEach(n => layers[n.l].push(n));
  const edges = (list, k) => {
    const seen = new Set(), e = [];
    list.forEach((a, i) => {
      list.map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) })).filter(o => o.j !== i)
        .sort((p, q) => p.d - q.d).slice(0, k).forEach(o => {
          const key = Math.min(i, o.j) + '-' + Math.max(i, o.j);
          if (!seen.has(key)) { seen.add(key); e.push([a, list[o.j]]); }
        });
    });
    return e;
  };
  const lines = (list, k) => edges(list, k).map(([a, b]) => `<line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}"/>`).join('');
  const dots = (list, r) => list.map(n => `<circle cx="${f1(n.x)}" cy="${f1(n.y)}" r="${r}"/>`).join('');

  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${f1(R() * W)}" cy="${f1(R() * H * 0.8)}" r="${f1(0.4 + R() * 0.8)}" fill="#fff" opacity="${f1(0.15 + R() * 0.6)}"/>`;
  const glows = layers[2].slice(0, 6).map(n => `<circle cx="${f1(n.x)}" cy="${f1(n.y)}" r="${f1(6 + R() * 6)}" fill="url(#aGlow)"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="aBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070F"/><stop offset=".45" stop-color="#0F1628"/><stop offset=".78" stop-color="#26304A"/><stop offset="1" stop-color="#5B6478"/></linearGradient>
  <radialGradient id="aHalo" cx="${F.x}" cy="${F.y}" r="230" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7FB7E8" stop-opacity=".6"/><stop offset=".35" stop-color="#3E6CA8" stop-opacity=".3"/><stop offset="1" stop-color="#0B1020" stop-opacity="0"/></radialGradient>
  <radialGradient id="aGlow"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset=".3" stop-color="#BFE3FF" stop-opacity=".55"/><stop offset="1" stop-color="#BFE3FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="aFocal"><stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset=".12" stop-color="#DFF3FF" stop-opacity=".9"/><stop offset=".4" stop-color="#7DB9F0" stop-opacity=".3"/><stop offset="1" stop-color="#7DB9F0" stop-opacity="0"/></radialGradient>
  <radialGradient id="aWarm"><stop offset="0" stop-color="#FFF1CC" stop-opacity="1"/><stop offset=".15" stop-color="#FFC46B" stop-opacity=".85"/><stop offset=".5" stop-color="#E08A2E" stop-opacity=".22"/><stop offset="1" stop-color="#E08A2E" stop-opacity="0"/></radialGradient>
  <radialGradient id="aVig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#03050C" stop-opacity=".8"/></radialGradient>
  <linearGradient id="aFog" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#9AA3B5" stop-opacity="0"/><stop offset="1" stop-color="#B7BEC9" stop-opacity=".34"/></linearGradient>
  <pattern id="aHatch" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".45"/></pattern>
  <filter id="aB3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.6"/></filter>
  <filter id="aB1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.8"/></filter>
  <filter id="aB6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  <mask id="aFade"><rect width="${W}" height="${H}" fill="url(#aFadeG)"/></mask>
  <radialGradient id="aFadeG" cx="${F.x}" cy="${F.y}" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#aBg)"/>
<rect width="${W}" height="${H}" fill="url(#aHalo)"/>
${stars}
<g mask="url(#aFade)">
  <g filter="url(#aB3)" opacity=".42" stroke="#7B90B8" stroke-width=".9" fill="#9FB2D6">${lines(layers[0], 3)}${dots(layers[0], 1.4)}</g>
  <g filter="url(#aB1)" opacity=".7" stroke="#A9BBDD" stroke-width=".9" fill="#C8D5EE">${lines(layers[1], 3)}${dots(layers[1], 1.7)}</g>
  <g stroke="#DCE6F7" stroke-width="1.15" fill="#F2F6FF" opacity=".95">${lines(layers[2], 2)}${dots(layers[2], 2.2)}</g>
  ${glows}
</g>
<circle cx="${F.x}" cy="${F.y}" r="95" fill="url(#aFocal)" filter="url(#aB6)" opacity=".9"/>
<g fill="none" stroke="#CFE6FF" opacity=".7"><circle cx="${F.x}" cy="${F.y}" r="16" stroke-width=".9"/><circle cx="${F.x}" cy="${F.y}" r="27" stroke-width=".6" stroke-dasharray="3 4"/><circle cx="${F.x}" cy="${F.y}" r="42" stroke-width=".5" opacity=".6"/></g>
<circle cx="${F.x}" cy="${F.y}" r="3.6" fill="#fff"/>
<circle cx="${F.x}" cy="${F.y}" r="9" fill="url(#aGlow)"/>
<circle cx="146" cy="238" r="46" fill="url(#aWarm)" opacity=".85"/>
<circle cx="146" cy="238" r="2.8" fill="#FFF3D6"/>
<rect width="${W}" height="${H}" fill="url(#aFog)"/>
<rect width="${W}" height="${H}" fill="url(#aHatch)" opacity=".11"/>
<rect width="${W}" height="${H}" fill="url(#aVig)"/>
</svg>`;
}

// ---------- ART B: art deco engine ----------
function gearPath(cx, cy, R, teeth, hole) {
  const root = R * 0.85, step = (2 * Math.PI) / teeth; let d = '';
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    [[root, a - step * 0.3], [R, a - step * 0.17], [R, a + step * 0.17], [root, a + step * 0.3]].forEach(([r, ang], i) => {
      d += (k === 0 && i === 0 ? 'M' : 'L') + f1(cx + r * Math.cos(ang)) + ' ' + f1(cy + r * Math.sin(ang));
    });
  }
  d += 'Z';
  if (hole) d += ` M${f1(cx + hole)} ${f1(cy)} A${f1(hole)} ${f1(hole)} 0 1 0 ${f1(cx - hole)} ${f1(cy)} A${f1(hole)} ${f1(hole)} 0 1 0 ${f1(cx + hole)} ${f1(cy)} Z`;
  return d;
}
function gear(id, cx, cy, R, teeth, { light, dark, spokes = 0, detail = true, extra = '' } = {}) {
  const ring = gearPath(cx, cy, R, teeth, R * 0.66);
  let g = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(cx - R)}" y1="${f1(cy - R)}" x2="${f1(cx + R * 0.8)}" y2="${f1(cy + R)}"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`;
  g += `<path d="${ring}" fill="url(#${id})" fill-rule="evenodd" stroke="#2A1206" stroke-width=".8" stroke-opacity=".55"/>`;
  if (detail) {
    g += `<path d="${ring}" fill="none" stroke="url(#${id}h)" stroke-width="1.2" fill-rule="evenodd"/>`;
    g = g.replace('</defs>', `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${f1(cx - R)}" y1="${f1(cy - R)}" x2="${f1(cx + R * 0.5)}" y2="${f1(cy + R * 0.6)}"><stop offset="0" stop-color="#FFE7C2" stop-opacity=".95"/><stop offset="1" stop-color="#FFE7C2" stop-opacity="0"/></linearGradient></defs>`);
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.66)}" fill="none" stroke="#3A1B08" stroke-width="1.4" opacity=".75"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.3)}" fill="url(#${id})"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.3)}" fill="none" stroke="#FFE7C2" stroke-width=".9" opacity=".5"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.11)}" fill="#2A1306"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.11)}" fill="none" stroke="#FFE7C2" stroke-width=".7" opacity=".45"/>`;
    for (let s = 0; s < spokes; s++) {
      const a = (360 / spokes) * s + 18;
      g += `<rect x="${f1(cx - R * 0.055)}" y="${f1(cy - R * 0.66)}" width="${f1(R * 0.11)}" height="${f1(R * 0.4)}" rx="${f1(R * 0.03)}" fill="url(#${id})" transform="rotate(${a} ${cx} ${cy})"/>`;
      g += `<rect x="${f1(cx - R * 0.055)}" y="${f1(cy - R * 0.66)}" width="${f1(R * 0.11)}" height="${f1(R * 0.4)}" rx="${f1(R * 0.03)}" fill="none" stroke="#FFE7C2" stroke-width=".6" opacity=".35" transform="rotate(${a} ${cx} ${cy})"/>`;
      const ra = ((a - 90) * Math.PI) / 180;
      g += `<circle cx="${f1(cx + R * 0.24 * Math.cos(ra))}" cy="${f1(cy + R * 0.24 * Math.sin(ra))}" r="${f1(R * 0.028)}" fill="#FFE1B0" opacity=".8"/>`;
    }
  }
  return g + extra;
}
function artB() {
  const R = rng(21), W = 430, H = 364, O = { x: 34, y: 14 };
  let rays = '';
  for (let a = 8; a <= 84; a += 6.5) {
    const r1 = ((a - 1.4) * Math.PI) / 180, r2 = ((a + 1.4) * Math.PI) / 180, L = 760;
    rays += `<polygon points="${O.x},${O.y} ${f1(O.x + L * Math.cos(r1))},${f1(O.y + L * Math.sin(r1))} ${f1(O.x + L * Math.cos(r2))},${f1(O.y + L * Math.sin(r2))}" fill="#FFF3DC" opacity="${(a / 6.5) % 2 < 1 ? '.13' : '.06'}"/>`;
  }
  let sun = '';
  for (let i = 0; i < 36; i++) { const a = (i * 10 * Math.PI) / 180; sun += `<line x1="${f1(226 + 40 * Math.cos(a))}" y1="${f1(214 + 40 * Math.sin(a))}" x2="${f1(226 + 260 * Math.cos(a))}" y2="${f1(214 + 260 * Math.sin(a))}"/>`; }
  let motes = '';
  for (let i = 0; i < 48; i++) motes += `<circle cx="${f1(R() * W)}" cy="${f1(R() * H)}" r="${f1(0.5 + R() * 1.7)}" fill="#FFE9C8" opacity="${f1(0.12 + R() * 0.5)}"/>`;
  const shadow = (cx, cy, Rr, t) => `<path d="${gearPath(cx + 5, cy + 8, Rr, t, Rr * 0.66)}" fill="#1E0C03" fill-rule="evenodd" opacity=".55" filter="url(#bB4)"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <radialGradient id="bBg" cx="${O.x}" cy="${O.y}" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F6C98A"/><stop offset=".22" stop-color="#D9964F"/><stop offset=".5" stop-color="#8F4E1F"/><stop offset=".8" stop-color="#4A250E"/><stop offset="1" stop-color="#22100600"/></radialGradient>
  <radialGradient id="bGlow" cx="${O.x}" cy="${O.y}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF4E0" stop-opacity=".85"/><stop offset=".3" stop-color="#FFD9A6" stop-opacity=".35"/><stop offset="1" stop-color="#FFD9A6" stop-opacity="0"/></radialGradient>
  <radialGradient id="bVig" cx=".35" cy=".3" r=".9"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1A0A03" stop-opacity=".78"/></radialGradient>
  <radialGradient id="bRayMask" cx="${O.x}" cy="${O.y}" r="520" gradientUnits="userSpaceOnUse"><stop offset=".05" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="bRM"><rect width="${W}" height="${H}" fill="url(#bRayMask)"/></mask>
  <filter id="bB4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="bB2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="bB1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.7"/></filter>
  <pattern id="bHatch" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".4"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#2A140A"/>
<rect width="${W}" height="${H}" fill="url(#bBg)"/>
<g mask="url(#bRM)" filter="url(#bB2)">${rays}</g>
<g stroke="#FFDCAE" stroke-width=".6" opacity=".22">${sun}</g>
<!-- far gears (kept out from under the light source) -->
<g filter="url(#bB4)" opacity=".45">
  <path d="${gearPath(404, 318, 158, 30, 104)}" fill="#3A1C0A" fill-rule="evenodd"/>
  <path d="${gearPath(28, 340, 122, 24, 80)}" fill="#3F1F0C" fill-rule="evenodd"/>
</g>
<!-- mid gears -->
<g opacity=".92">
  ${gear('bgM1', 322, 118, 96, 22, { light: '#D69A5A', dark: '#5C2F12', spokes: 6 })}
  ${gear('bgM2', 96, 226, 74, 18, { light: '#C88A4C', dark: '#4E2610', spokes: 5 })}
</g>
<!-- near gears -->
${shadow(226, 214, 72, 16)}
${gear('bgN1', 226, 214, 72, 16, { light: '#F3C284', dark: '#6A3512', spokes: 5 })}
${shadow(338, 268, 38, 11)}
${gear('bgN2', 338, 268, 38, 11, { light: '#EBB06E', dark: '#5E2E10', spokes: 4 })}
${shadow(158, 98, 32, 10)}
${gear('bgN3', 158, 98, 32, 10, { light: '#F0BB7A', dark: '#63300F', spokes: 3 })}
<!-- connecting rod -->
<g filter="url(#bB4)" opacity=".5"><rect x="230" y="222" width="150" height="14" rx="4" fill="#1E0C03" transform="rotate(26 230 222)"/></g>
<rect x="226" y="212" width="150" height="12" rx="4" fill="#B5763A" transform="rotate(26 226 212)"/>
<rect x="226" y="212" width="150" height="4" rx="2" fill="#F5D2A0" opacity=".8" transform="rotate(26 226 212)"/>
<circle cx="230" cy="216" r="6" fill="#3A1B08"/><circle cx="230" cy="216" r="3.2" fill="#F0C58C"/>
<!-- deco band -->
<g stroke="#F3CE9C" stroke-width="1" opacity=".38"><line x1="0" y1="330" x2="140" y2="330"/><line x1="0" y1="337" x2="112" y2="337"/><line x1="0" y1="344" x2="84" y2="344"/></g>
<g stroke="#F3CE9C" stroke-width="1" opacity=".3"><line x1="430" y1="52" x2="300" y2="52"/><line x1="430" y1="59" x2="330" y2="59"/><line x1="430" y1="66" x2="360" y2="66"/></g>
${motes}
<circle cx="${O.x}" cy="${O.y}" r="300" fill="url(#bGlow)"/>
<rect width="${W}" height="${H}" fill="url(#bHatch)" opacity=".14"/>
<rect width="${W}" height="${H}" fill="url(#bVig)"/>
</svg>`;
}

// ---------- CSS ----------
const css = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  min-height: 100vh;
  background-color: #17181C;
  background-image: radial-gradient(120% 80% at 50% -14%, #2B2C31 0%, #1E1F24 36%, #17181C 62%, #0F1013 100%);
  color: #B8B9BE;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 24px;
}
.title { margin: 0 0 44px; font-size: 12px; font-weight: 500; letter-spacing: .08em; color: #6C6E75; }
.scene { display: flex; gap: 64px; align-items: center; justify-content: center; flex-wrap: wrap; }
body.detail { padding: 42px 24px; }
body.detail .title { display: none; }
body.detail .card { --w: 720px; --rz: 0deg; }

/* ---- card shell ---- */
.card {
  --w: 400px;
  --mx: 64%; --my: 30%;
  --rx: 0deg; --ry: 0deg; --rz: 0deg;
  --gl: .3;
  --fp: calc(var(--mx) * 1.2 - 10%) calc(var(--my) * 1.2 - 10%);
  --falloff: radial-gradient(farthest-corner circle at var(--mx) var(--my), #000 0%, rgba(0,0,0,.92) 28%, rgba(0,0,0,.55) 62%, rgba(0,0,0,.22) 100%);
  width: var(--w); height: calc(var(--w) * 86 / 59);
  container-type: size;
  transform: perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry)) rotate(var(--rz));
  transition: transform .55s cubic-bezier(.2,.8,.2,1);
}
.card-a { --rz: -1.25deg; }
.card-b { --rz: .9deg; }
.card.is-hover { transition: transform .07s linear; will-change: transform; }
.card-inner {
  position: relative; width: 100%; height: 100%;
  border-radius: 4.5cqw; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; align-items: stretch;
  padding: 4.6cqw 7cqw 5.66cqw;
  background-size: 240px 720px, 160px 160px, 100% 100%, 100% 100%, 100% 100%;
  background-blend-mode: soft-light, overlay, normal, normal, normal;
  box-shadow:
    inset 0 0 0 2px var(--edge),
    inset 0 0 0 3px var(--chamfer),
    inset 0 0 0 4px var(--shade),
    0 1px 0 rgba(255,255,255,.10),
    0 1px 2px rgba(0,0,0,.75),
    0 2px 3px rgba(0,0,0,.45),
    0 10px 14px -6px rgba(0,0,0,.55),
    2px 28px 36px -12px rgba(0,0,0,.66),
    4px 64px 80px -30px rgba(0,0,0,.6);
}
.name, .badge, .type, .strip, .effect { position: relative; z-index: 3; }
.card-inner::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 4;
  box-shadow: inset 0 1.5px 0 rgba(255,255,255,.62), inset 1.5px 0 0 rgba(255,255,255,.30), inset 0 -1.5px 0 rgba(0,0,0,.34), inset -1.5px 0 0 rgba(0,0,0,.18);
}
.card-inner::before {
  content: ""; position: absolute; inset: 1.9cqw; border-radius: 2.9cqw; pointer-events: none; z-index: 1;
  box-shadow:
    -1px -1px 0 var(--ridge-l), 1px 1px 0 var(--ridge-d),
    inset 1px 1px 0 var(--ridge-d), inset -1px -1px 0 var(--ridge-l);
}
/* ---- card A: silver ---- */
.card-a {
  --edge: #8A8E99; --chamfer: rgba(255,255,255,.92); --shade: rgba(80,84,96,.30);
  --ridge-l: rgba(255,255,255,.98); --ridge-d: rgba(60,64,76,.62);
  --ink: #23262E; --ink-shadow: rgba(255,255,255,.72);
}
.card-a .card-inner {
  background-color: #E2E3E7;
  background-image:
    ${BRUSH}, ${GRAIN},
    radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(40,44,56,.14) 100%),
    linear-gradient(155deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.18) 32%, rgba(255,255,255,0) 50%, rgba(22,24,32,.10) 74%, rgba(22,24,32,.24) 100%),
    linear-gradient(180deg, #F2F2F4 0%, #E5E6EA 42%, #D5D7DD 74%, #C9CBD2 100%);
}
/* ---- card B: orange ---- */
.card-b {
  --edge: #7E4A1E; --chamfer: rgba(241,192,140,.95); --shade: rgba(90,50,20,.28);
  --ridge-l: rgba(247,205,160,.95); --ridge-d: rgba(90,50,20,.62);
  --ink: #341D0E; --ink-shadow: rgba(255,226,190,.55);
}
.card-b .card-inner {
  background-color: #D48B45;
  background-image:
    ${BRUSH_B}, ${GRAIN_B},
    radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(70,30,6,.30) 100%),
    linear-gradient(155deg, rgba(255,228,190,.5) 0%, rgba(255,228,190,.14) 32%, rgba(255,228,190,0) 50%, rgba(60,25,5,.12) 74%, rgba(60,25,5,.3) 100%),
    linear-gradient(180deg, #E4A15E 0%, #D48B45 42%, #C67B37 74%, #B86F2E 100%);
}

/* ---- name plate (raised, lit top-left) ---- */
.plate {
  position: relative; height: 13.1cqw; margin-bottom: 2.2cqw; flex: none;
  display: flex; align-items: center; justify-content: space-between; gap: 2cqw;
  padding: 0 1.45cqw 0 2.8cqw; border-radius: 1.2cqw;
  background: linear-gradient(180deg, var(--plate-1), var(--plate-2) 55%, var(--plate-3));
  box-shadow:
    inset 0 1px 0 var(--plate-hi), inset 1px 0 0 var(--plate-hi2),
    inset 0 -1px 0 var(--plate-lo), inset -1px 0 0 var(--plate-lo2),
    0 1px 1px var(--plate-drop), 1px 1px 0 var(--plate-drop), 0 0 0 1px var(--plate-line);
}
.card-a .plate { --plate-1: rgba(255,255,255,.62); --plate-2: rgba(255,255,255,.34); --plate-3: rgba(255,255,255,.22); --plate-hi: rgba(255,255,255,1); --plate-lo: rgba(70,74,86,.45); --plate-hi2: rgba(255,255,255,.75); --plate-lo2: rgba(70,74,86,.28); --plate-drop: rgba(40,44,55,.38); --plate-line: rgba(70,74,86,.42); }
.card-b .plate { --plate-1: rgba(255,232,200,.48); --plate-2: rgba(255,232,200,.24); --plate-3: rgba(255,232,200,.14); --plate-hi: rgba(255,238,210,.95); --plate-lo: rgba(90,50,20,.48); --plate-hi2: rgba(255,238,210,.62); --plate-lo2: rgba(90,50,20,.3); --plate-drop: rgba(60,30,10,.42); --plate-line: rgba(110,60,25,.52); }
.name {
  margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: visible;
  font-family: "Cormorant SC", "Cormorant", Georgia, serif; font-weight: 600; font-size: 4.6cqw; line-height: 1;
  letter-spacing: .012em; color: var(--ink); text-shadow: 0 1px 0 var(--ink-shadow);
  padding-bottom: .3cqw;
}
.name > span { display: inline-block; transform-origin: 0 50%; transform: scaleX(var(--cond, 1)); }
/* ---- badge: struck coin, rim in the card's own metal ---- */
.badge {
  flex: none; position: relative; width: 10.2cqw; height: 10.2cqw; border-radius: 50%;
  display: grid; place-items: center;
  font: 700 2.3cqw/1 Inter, system-ui, sans-serif; letter-spacing: .12em; text-indent: .12em; color: var(--coin-ink);
  text-shadow: 0 1px 0 rgba(0,0,0,.65), 0 -1px 0 rgba(255,255,255,.14);
  background-image:
    repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,.55) 0deg 3deg, rgba(0,0,0,.42) 3deg 6deg),
    conic-gradient(from 205deg at 50% 50%, var(--rim-1) 0deg, var(--rim-2) 70deg, var(--rim-3) 150deg, var(--rim-2) 210deg, var(--rim-1) 290deg, var(--rim-3) 330deg, var(--rim-1) 360deg);
  background-blend-mode: overlay, normal;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.38),
    0 0 0 1px var(--rim-dark),
    0 1px 2px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.35);
}
.badge::before {
  content: ""; position: absolute; inset: 11%; border-radius: 50%; pointer-events: none; z-index: -1;
  background-image:
    radial-gradient(circle at 32% 26%, rgba(255,255,255,.30) 0%, rgba(255,255,255,.08) 20%, rgba(255,255,255,0) 40%),
    repeating-conic-gradient(from 12deg at 50% 50%, rgba(255,255,255,.08) 0deg 3deg, rgba(0,0,0,.10) 3deg 6deg),
    radial-gradient(circle at 50% 50%, var(--coin-1) 0%, var(--coin-2) 58%, var(--coin-3) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.22),
    inset 0 1.5px 2px rgba(0,0,0,.6),
    inset 0 -1px 0 rgba(255,255,255,.10),
    0 0 0 1px rgba(0,0,0,.55),
    0 1px 0 1px rgba(255,255,255,.18);
}
.badge-eng { --rim-1: #FBFBFD; --rim-2: #8E929E; --rim-3: #DADCE2; --rim-dark: #4A4E5A; --coin-1: #4E5364; --coin-2: #2E3240; --coin-3: #1A1D26; --coin-ink: #EEF0F5; }
.badge-ops { --rim-1: #FBE0BD; --rim-2: #9A5A26; --rim-3: #E4AC72; --rim-dark: #5A3212; --coin-1: #3E62B2; --coin-2: #1E3A78; --coin-3: #10224E; --coin-ink: #EEF2FF; }

/* ---- art window: raised metallic lip, art set into it ---- */
.art {
  position: relative; height: 72.9cqw; margin-bottom: 1.6cqw; flex: none;
  border-radius: 1.1cqw;
  background: linear-gradient(145deg, var(--bz-1) 0%, var(--bz-2) 40%, var(--bz-3) 100%);
  box-shadow:
    inset 1px 1px 0 var(--bz-hi), inset -1px -1px 0 var(--bz-lo),
    0 0 0 1px var(--bz-out), 0 1px 2px rgba(0,0,0,.28), 1px 1px 0 var(--bz-out);
}
.card-a .art { --bz-1: #FCFCFD; --bz-2: #D3D5DB; --bz-3: #9FA3AD; --bz-hi: rgba(255,255,255,.9); --bz-lo: rgba(50,54,64,.45); --bz-out: rgba(50,54,64,.42); }
.card-b .art { --bz-1: #FADDB8; --bz-2: #D89A5B; --bz-3: #8E4F1E; --bz-hi: rgba(255,232,200,.85); --bz-lo: rgba(70,35,10,.5); --bz-out: rgba(70,35,10,.5); }
.art-inner { position: absolute; inset: .95cqw; border-radius: .5cqw; overflow: hidden; background: #0B0F1C; }
.art-inner > svg, .art-inner > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; }
.art-inner::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow:
    inset 0 3px 6px rgba(0,0,0,.78), inset 0 1px 0 rgba(0,0,0,.7),
    inset 3px 0 5px rgba(0,0,0,.5), inset -2px 0 4px rgba(0,0,0,.34), inset 0 -2px 4px rgba(0,0,0,.3),
    inset 0 -1px 0 rgba(255,255,255,.16),
    inset 0 0 0 1px rgba(0,0,0,.6);
}
/* ---- type line ---- */
.type {
  height: 5.8cqw; margin: 0 0 1.4cqw; flex: none; white-space: nowrap; overflow: hidden; padding-left: .2cqw;
  font-family: "EB Garamond", Georgia, serif; font-weight: 700; font-size: 3.1cqw; line-height: 5.8cqw;
  color: var(--ink); letter-spacing: .004em;
}
/* ---- effect box (paper set into the frame) ---- */
.effect {
  height: 29.2cqw; margin-bottom: 2cqw; flex: none; padding: 1.5cqw 2.2cqw 1.3cqw;
  border-radius: .7cqw; border: 1px solid var(--paper-line);
  background-color: #F3ECD8;
  background-image: ${PAPER}, radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 65%), linear-gradient(180deg, #F7F1E1 0%, #F2EAD5 55%, #EBE1C8 100%);
  background-size: 100px 100px, 100% 100%, 100% 100%;
  background-blend-mode: soft-light, normal, normal;
  box-shadow:
    inset 0 2px 3px rgba(60,40,10,.30), inset 2px 0 3px rgba(60,40,10,.14),
    inset 0 -1px 0 rgba(255,255,255,.75), inset -1px 0 0 rgba(255,255,255,.45),
    inset 0 0 0 1px rgba(120,100,60,.18),
    0 1px 0 var(--paper-drop);
  color: #2A2219;
  font-family: "EB Garamond", Georgia, serif; font-size: 3.6cqw; line-height: 1.3;
  text-align: left; hyphens: manual; text-wrap: pretty;
}
.card-a .effect { --paper-line: #9C8F78; --paper-drop: rgba(255,255,255,.6); }
.card-b .effect { --paper-line: #6F4C28; --paper-drop: rgba(255,228,190,.5); }
.effect p { margin: 0; }
/* ---- bottom strip ---- */
.strip {
  height: 7.3cqw; flex: none; display: flex; justify-content: space-between; align-items: center; padding: 0 .3cqw;
  font: 600 2.05cqw/1 Inter, system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink); opacity: .82;
}
.strip .copy { opacity: .9; }

/* ---- foil / glare layers (siblings, blend with frame + art; ink is stacked above) ---- */
.foil, .sheen, .prism, .glitter, .satin, .glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2; }
.foil, .sheen, .prism, .satin, .glare { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }
/* rainbow band: silver at rest except one diagonal band whose hues compress toward the specular core */
.foil {
  background-image:
    linear-gradient(115deg,
      rgba(255,255,255,0) 47.4%,
      hsla(355, 95%, 62%, .5) 48.6%, hsl(355 95% 62%) 49.6%, hsl(40 100% 58%) 50.6%, hsl(95 85% 55%) 51.6%,
      hsl(175 90% 55%) 52.6%, hsl(215 95% 62%) 53.6%, hsl(275 90% 64%) 54.8%, hsl(320 90% 62%) 56%,
      hsla(320, 90%, 62%, .5) 57.2%, rgba(255,255,255,0) 58.6%),
    linear-gradient(115deg,
      rgba(255,255,255,0) 45%, hsla(355, 90%, 62%, .22) 46.5%, hsla(40, 100%, 58%, .22) 48.5%, hsla(95, 85%, 55%, .16) 50.5%,
      hsla(175, 90%, 55%, .12) 53%, hsla(215, 95%, 62%, .16) 55.5%, hsla(275, 90%, 64%, .22) 57.5%, hsla(320, 90%, 62%, .22) 59.5%, rgba(255,255,255,0) 61%);
  background-size: 240% 240%;
  background-position: var(--fp);
  mix-blend-mode: hard-light; opacity: .48;
  -webkit-mask-image: var(--falloff), ${MASK_FOIL}; mask-image: var(--falloff), ${MASK_FOIL};
  -webkit-mask-composite: source-in; mask-composite: intersect;
  transition: background-position .55s cubic-bezier(.2,.8,.2,1);
}
/* specular core of the band */
.sheen {
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 49.8%, rgba(255,255,255,.16) 51.4%, rgba(255,255,255,.6) 52.5%, rgba(255,255,255,.74) 53%, rgba(255,255,255,.58) 53.6%, rgba(255,255,255,.16) 54.8%, rgba(255,255,255,0) 56.4%);
  background-size: 240% 240%;
  background-position: var(--fp);
  mix-blend-mode: normal; opacity: .85;
  -webkit-mask-image: var(--falloff), ${MASK_SHEEN}; mask-image: var(--falloff), ${MASK_SHEEN};
  -webkit-mask-composite: source-in; mask-composite: intersect;
  transition: background-position .55s cubic-bezier(.2,.8,.2,1);
}
/* directional micro-grain, visible only inside the band */
.prism {
  background-image: repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 2px, rgba(255,255,255,.7) 2px 3px, rgba(0,0,0,.35) 3px 4px, rgba(0,0,0,0) 4px 6px);
  mix-blend-mode: overlay; opacity: .7;
  -webkit-mask-image: linear-gradient(115deg, transparent 45.5%, #000 48.5%, #000 57.5%, transparent 60.5%), ${MASK_SHEEN}, var(--falloff);
  mask-image: linear-gradient(115deg, transparent 45.5%, #000 48.5%, #000 57.5%, transparent 60.5%), ${MASK_SHEEN}, var(--falloff);
  -webkit-mask-size: 240% 240%, 100% 100%, 100% 100%; mask-size: 240% 240%, 100% 100%, 100% 100%;
  -webkit-mask-position: var(--fp), 0 0, 0 0; mask-position: var(--fp), 0 0, 0 0;
  -webkit-mask-composite: source-in; mask-composite: intersect;
  transition: -webkit-mask-position .55s cubic-bezier(.2,.8,.2,1), mask-position .55s cubic-bezier(.2,.8,.2,1);
}
.glitter {
  background-image: ${GLITTER}, ${GLITTER};
  background-size: 210px 210px, 150px 150px;
  background-position: calc(var(--mx) * .5) calc(var(--my) * .5), calc(100% - var(--mx) * .35) calc(var(--my) * .3);
  mix-blend-mode: color-dodge; opacity: .5;
  -webkit-mask-image: linear-gradient(#000, #000); mask-image: linear-gradient(#000, #000);
  -webkit-mask-size: 84.1cqw 71cqw; mask-size: 84.1cqw 71cqw;
  -webkit-mask-position: 7.95cqw 20.85cqw; mask-position: 7.95cqw 20.85cqw;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  transition: background-position .55s cubic-bezier(.2,.8,.2,1);
}
/* card B: brushed-copper satin band (no rainbow) */
.satin {
  background-image: linear-gradient(115deg,
    rgba(255,240,215,0) 44%, rgba(255,240,215,.16) 49%, rgba(255,240,215,.42) 52.5%, rgba(255,240,215,.5) 53.2%, rgba(255,240,215,.16) 57%, rgba(255,240,215,0) 62%);
  background-size: 240% 240%;
  background-position: var(--fp);
  mix-blend-mode: overlay; opacity: .95;
  -webkit-mask-image: ${MASK_SATIN}; mask-image: ${MASK_SATIN};
  transition: background-position .55s cubic-bezier(.2,.8,.2,1);
}
.glare {
  background: radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(255,255,255,.7) 0%, rgba(255,255,255,.28) 20%, rgba(255,255,255,0) 58%);
  mix-blend-mode: overlay; opacity: var(--gl);
  -webkit-mask-image: ${MASK_GLARE}; mask-image: ${MASK_GLARE};
  transition: opacity .5s ease, background-position .5s ease;
}
.card.is-hover .glare { --gl: .7; }
.card.is-hover .foil, .card.is-hover .sheen, .card.is-hover .prism, .card.is-hover .glitter, .card.is-hover .satin, .card.is-hover .glare { transition: none; }
.card-b .glare { --gl: .24; }
.card-b.is-hover .glare { --gl: .5; }
@media (prefers-reduced-motion: reduce) {
  .card { transform: none !important; transition: none; }
  .foil, .sheen, .prism, .glitter, .satin, .glare { transition: none; }
}
`;

// ---------- markup ----------
const cardA = `
<article class="card card-a" data-tilt="10" aria-label="Forward Deployed Engineer card">
  <div class="card-inner">
    <header class="plate">
      <h2 class="name"><span>Forward Deployed Engineer</span></h2>
      <span class="badge badge-eng">ENG</span>
    </header>
    <div class="art"><div class="art-inner">${artA()}</div></div>
    <p class="type">[Anthropic / San Francisco / May 2026 &ndash; Present]</p>
    <div class="effect"><p>Works with enterprise customers to design, build and ship production systems on Claude. Bridges customer requirements, solution architecture and hands-on implementation. Previously ran revenue strategy and compensation for global sales teams.</p></div>
    <footer class="strip"><span class="set">JS-EN001</span><span class="copy">&copy; 2026 Jaspal Singh</span></footer>
    <div class="foil"></div><div class="sheen"></div><div class="prism"></div><div class="glitter"></div><div class="glare"></div>
  </div>
</article>`;
const cardB = `
<article class="card card-b" data-tilt="6" aria-label="Director, Revenue Strategy and Operations card">
  <div class="card-inner">
    <header class="plate">
      <h2 class="name" style="--cond:${COND_B}"><span>Director, Revenue Strategy &amp; Operations</span></h2>
      <span class="badge badge-ops">OPS</span>
    </header>
    <div class="art"><div class="art-inner">${artB()}</div></div>
    <p class="type">[Engine / Toronto / Jan 2025 &ndash; Apr 2026]</p>
    <div class="effect"><p>Led the operations team across new business sales, expansion sales, revenue data, product GTM operations and compensation. Launched compensation infrastructure covering every variable role, aligning incentives with company goals. Scaled the team as the business grew.</p></div>
    <footer class="strip"><span class="set">JS-EN003</span><span class="copy">&copy; 2026 Jaspal Singh</span></footer>
    <div class="satin"></div><div class="glare"></div>
  </div>
</article>`;

const js = `
(function(){
  if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.card').forEach(function(card){
    var max = parseFloat(card.dataset.tilt || '10'), raf = 0, px = .5, py = .5;
    function apply(){
      raf = 0;
      card.style.setProperty('--mx', (px*100).toFixed(2) + '%');
      card.style.setProperty('--my', (py*100).toFixed(2) + '%');
      card.style.setProperty('--rx', ((.5 - py) * 2 * max).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - .5) * 2 * max).toFixed(2) + 'deg');
    }
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      card.classList.add('is-hover');
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener('pointerleave', function(){
      card.classList.remove('is-hover');
      ['--mx','--my','--rx','--ry'].forEach(function(p){ card.style.removeProperty(p); });
    });
  });
})();`;

const debugJs = DEBUG ? `
document.fonts.ready.then(function(){
  var out = [];
  document.querySelectorAll('.name').forEach(function(h){
    var s = h.querySelector('span'); var prev = s.style.transform; s.style.transform = 'none';
    out.push(h.closest('.card').className + ':avail=' + h.clientWidth.toFixed(1) + ':text=' + s.getBoundingClientRect().width.toFixed(1));
    s.style.transform = prev;
  });
  document.querySelectorAll('.effect p').forEach(function(p){ out.push('effect:h=' + p.getBoundingClientRect().height.toFixed(1) + ':box=' + p.parentElement.clientHeight); });
  document.title = 'MEASURE ' + out.join(' | ');
});` : '';

function page({ detail }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Card fidelity proof</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+SC:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@500;600;700&display=block" rel="stylesheet">
<style>${css}</style>
</head>
<body class="${detail ? 'detail' : ''}">
<p class="title">Card fidelity proof</p>
<main class="scene">${cardA}${detail ? '' : cardB}</main>
<script>${js}${debugJs}</script>
</body>
</html>`;
}

fs.writeFileSync(path.join(OUT, 'index.html'), page({ detail: false }));
fs.writeFileSync(path.join(OUT, 'detail.html'), page({ detail: true }));
console.log('wrote index.html, detail.html');
