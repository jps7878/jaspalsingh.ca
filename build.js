#!/usr/bin/env node
'use strict';
/*
 * jaspalsingh.ca build. Zero dependencies, Node 18+.
 *
 *   node build.js
 *
 * Reads content.json and writes:
 *   index.html                 the site (inline CSS, tiny inline script, one Google Fonts link)
 *   qa/detail.html             the first career card alone at 720px, for close-up renders
 *   assets/art/placeholder-01-anthropic.svg and placeholder-03-engine.svg
 *                              the two code-drawn placeholders carried over from the proof
 *
 * Every string on the page comes from content.json; this file holds templates only.
 * Deterministic: seeded PRNG for textures and art, no timestamps, no network.
 *
 * Art slot rule: for each card, if the file named in "art" exists it is used, otherwise
 * "artPlaceholder". Same for the hero photo (a neutral initials tile until it exists).
 * Re-running `node build.js` after dropping files in is the whole upgrade path.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

// ---------- helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const b64 = s => `url("data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}")`;
const f1 = n => (Math.round(n * 10) / 10).toString();
const f2 = n => (Math.round(n * 100) / 100).toString();
const r3 = n => Math.round(n * 1000) / 1000;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const initials = name => name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

// ---------- card geometry (card-width units, cqw) ----------
// Career card, top to bottom: padding 4.4 / 7 / 5.2; plate 12.8; art 72.9 (inner inset .95, 50% of height);
// type 5.5; effect 32.06 (22%); strip 6.8. Total height 145.76 = 86/59 * 100 (the trading-card ratio).
// The proof's margins were trimmed by 2.9cqw in total so the effect box (the readable part) could grow.
const G = {
  padT: 4.4, padX: 7, padB: 5.2, plate: 12.8, plateMb: 1.9, art: 72.9, artMb: 1.4,
  type: 5.5, typeMb: 1.1, effectMb: 1.7, strip: 6.8,
  platePadL: 2.8, platePadR: 1.45, plateGap: 2, badge: 10.2,
  nameFs: 4.6, nameFsMin: 3.7, nameCondMin: 0.8, nameTracking: 0.012,
  typeFs: 3.6, effectFs: 4.0, effectLh: 1.25, effectPadX: 1.8, effectPadT: 1.2, effectPadB: 1.0,
  stripFs: 2.5,
};
G.height = r3((86 / 59) * 100); // 145.763
G.effect = r3(G.height - (G.padT + G.plate + G.plateMb + G.art + G.artMb + G.type + G.typeMb + G.effectMb + G.strip + G.padB)); // 32.06
G.inner = 100 - 2 * G.padX; // 86
// Skill card: padding 4.4 / 7 / 4.4; plate 12.8; one-line text box 9.6.
const S = { padT: 4.4, padX: 7, padB: 4.4, plate: 12.8, plateMb: 1.9, line: 9.6, lineFs: 3.6, linePadX: 1.5, kindFs: 3.1 };
S.height = r3(S.padT + S.plate + S.plateMb + S.line + S.padB); // 33.1

// ---------- font metrics (advance widths per 1000 em, measured once in Chrome) ----------
// Cormorant SC 600 (card names), EB Garamond 400 (effect text), EB Garamond 700 (type line, kind mark).
// Per-glyph sums land within 1% of Chrome's whole-string measurement; a 1% margin is added below.
const METRICS = {"csc600":{"0":547,"1":344,"2":449,"3":444,"4":480,"5":433,"6":501,"7":476,"8":571,"9":501," ":234,"!":258,"\"":295,"#":526,"$":418,"%":574,"&":546,"'":147,"(":309,")":309,"*":448,"+":398,",":222,"-":282,".":204,"/":348,":":204,";":225,"<":407,"=":468,">":407,"?":336,"@":726,"A":711,"B":582,"C":669,"D":700,"E":547,"F":518,"G":717,"H":762,"I":339,"J":333,"K":653,"L":541,"M":850,"N":732,"O":766,"P":549,"Q":766,"R":689,"S":507,"T":640,"U":701,"V":662,"W":918,"X":649,"Y":616,"Z":602,"[":274,"\\":348,"]":274,"^":392,"_":398,"`":274,"a":557,"b":516,"c":533,"d":567,"e":464,"f":423,"g":553,"h":629,"i":300,"j":271,"k":549,"l":466,"m":686,"n":566,"o":570,"p":468,"q":570,"r":542,"s":412,"t":500,"u":571,"v":510,"w":735,"x":529,"y":493,"z":452,"{":289,"|":168,"}":283,"~":452,"–":515,"—":830,"’":188,"‘":190,"“":352,"”":352,"©":703},"ebg400":{"0":480,"1":480,"2":480,"3":480,"4":480,"5":480,"6":480,"7":480,"8":480,"9":480," ":200,"!":250,"\"":330,"#":468,"$":441,"%":650,"&":756,"'":200,"(":315,")":315,"*":340,"+":590,",":230,"-":274,".":230,"/":399,":":248,";":228,"<":560,"=":566,">":560,"?":376,"@":749,"A":692,"B":587,"C":710,"D":754,"E":564,"F":512,"G":729,"H":810,"I":340,"J":340,"K":681,"L":584,"M":901,"N":792,"O":763,"P":552,"Q":763,"R":713,"S":465,"T":670,"U":738,"V":672,"W":916,"X":707,"Y":578,"Z":603,"[":331,"\\":399,"]":331,"^":500,"_":500,"`":200,"a":399,"b":515,"c":407,"d":506,"e":390,"f":318,"g":435,"h":515,"i":245,"j":226,"k":469,"l":240,"m":778,"n":528,"o":495,"p":519,"q":522,"r":334,"s":323,"t":314,"u":527,"v":438,"w":685,"x":430,"y":438,"z":377,"{":376,"|":260,"}":376,"~":500,"–":550,"—":950,"’":242,"‘":242,"“":418,"”":418,"©":665},"ebg700":{"0":529,"1":529,"2":529,"3":529,"4":529,"5":529,"6":529,"7":529,"8":529,"9":529," ":237,"!":290,"\"":398,"#":484,"$":461,"%":702,"&":799,"'":237,"(":304,")":304,"*":357,"+":601,",":247,"-":316,".":247,"/":406,":":282,";":247,"<":541,"=":629,">":541,"?":395,"@":781,"A":720,"B":626,"C":709,"D":766,"E":575,"F":546,"G":719,"H":801,"I":364,"J":370,"K":763,"L":586,"M":917,"N":809,"O":760,"P":607,"Q":760,"R":760,"S":494,"T":695,"U":745,"V":706,"W":1020,"X":750,"Y":654,"Z":596,"[":356,"\\":406,"]":356,"^":514,"_":590,"`":237,"a":438,"b":542,"c":411,"d":553,"e":417,"f":360,"g":500,"h":559,"i":295,"j":266,"k":546,"l":285,"m":807,"n":566,"o":503,"p":551,"q":536,"r":414,"s":360,"t":375,"u":551,"v":483,"w":752,"x":505,"y":481,"z":437,"{":373,"|":276,"}":373,"~":545,"–":632,"—":960,"’":239,"‘":239,"“":439,"”":439,"©":681}};
const emWidth = (table, str, tracking = 0) => {
  let w = 0;
  for (const ch of str) w += (table[ch] !== undefined ? table[ch] : table.n) + tracking * 1000;
  return (w / 1000) * 1.01;
};
function wrapLines(table, text, widthEm) {
  const words = text.split(/\s+/).filter(Boolean);
  const sp = emWidth(table, ' ');
  let lines = 1, cur = 0;
  for (const w of words) {
    const ww = emWidth(table, w);
    if (cur === 0) cur = ww;
    else if (cur + sp + ww <= widthEm) cur += sp + ww;
    else { lines++; cur = ww; }
  }
  return lines;
}
// Name plate title on one line, as real cards do: condense horizontally (scaleX) down to 0.8, the limit
// print condensing stops at; a title that needs more than that drops its size (to 3.7cqw at most) first.
// The inline script repeats the same rule with real font metrics after the fonts load.
function nameFit(str, availCqw) {
  const w = emWidth(METRICS.csc600, str, G.nameTracking) * G.nameFs;
  const r = availCqw / w;
  if (r >= 1) return { fs: G.nameFs, cond: 1 };
  if (r >= G.nameCondMin) return { fs: G.nameFs, cond: r3(r) };
  const fs = Math.max(G.nameFsMin, Math.floor((G.nameFs * r / G.nameCondMin) * 20) / 20);
  return { fs, cond: r3(Math.min(1, r * G.nameFs / fs)) };
}
// Effect text: largest size (stepping down from 4.0cqw) whose wrapped lines fit the box.
function effectSize(text) {
  const innerW = G.inner - 2 * G.effectPadX, innerH = G.effect - G.effectPadT - G.effectPadB;
  const steps = [4.0, 3.9, 3.8, 3.7, 3.6, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0, 2.85, 2.7];
  for (const fs of steps) if (wrapLines(METRICS.ebg400, text, innerW / fs) * fs * G.effectLh <= innerH) return fs;
  return steps[steps.length - 1];
}
// Skill one-liners: one size for all eight (the largest that keeps every line whole), so a row of
// compact cards reads as a set rather than eight sizes.
function skillLineSize(texts) {
  const innerW = G.inner - 2 * S.linePadX;
  const em = Math.max(...texts.map(t => emWidth(METRICS.ebg400, t)));
  for (const fs of [3.6, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0, 2.9, 2.8, 2.7]) if (em * fs <= innerW) return fs;
  return Math.max(2.5, r3(innerW / em));
}
function typeSize(str) {
  const avail = G.inner - 0.2, w = emWidth(METRICS.ebg700, str, 0.004) * G.typeFs;
  return w > avail ? r3(G.typeFs * avail / w) : G.typeFs;
}

// ---------- texture tiles (from the proof) ----------
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

// ---------- zone masks: full strength on the frame, partial over plate / art / effect box ----------
function zoneMask(H, zones) {
  const hole = r => `M${r.x} ${r.y} h${r.w} v${r.h} h-${r.w} z`;
  const fill = (r, o) => o >= 1 ? '' : `<rect x='${r.x}' y='${r.y}' width='${r.w}' height='${r.h}' fill='#fff' fill-opacity='${o}'/>`;
  const holes = zones.filter(z => z.o < 1).map(z => hole(z.r)).join(' ');
  return b64(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 ${f2(H)}' preserveAspectRatio='none'><path d='M0 0 H100 V${f2(H)} H0 Z ${holes}' fill='#fff' fill-rule='evenodd'/>${zones.map(z => fill(z.r, z.o)).join('')}</svg>`);
}
const CZ = { // career zones
  plate: { x: G.padX, y: G.padT, w: G.inner, h: G.plate },
  art: { x: G.padX + 0.95, y: G.padT + G.plate + G.plateMb + 0.95, w: G.inner - 1.9, h: G.art - 1.9 },
  effect: { x: G.padX, y: G.padT + G.plate + G.plateMb + G.art + G.artMb + G.type + G.typeMb, w: G.inner, h: G.effect },
};
const careerMask = (plate, art, effect) => zoneMask(G.height, [{ r: CZ.plate, o: plate }, { r: CZ.art, o: art }, { r: CZ.effect, o: effect }]);
// Plate zone .7 / .65 (was .9): most of the band's strength still crosses the plate, but the title stays readable under it.
const MASK_FOIL = careerMask(.7, .3, .05);
const MASK_SHEEN = careerMask(.65, .45, 0);
const MASK_SATIN = careerMask(.9, .35, 0);
const MASK_GLARE = careerMask(1, .8, .25);
const SZ = { plate: { x: S.padX, y: S.padT, w: 100 - 2 * S.padX, h: S.plate }, line: { x: S.padX, y: S.padT + S.plate + S.plateMb, w: 100 - 2 * S.padX, h: S.line } };
const skillMask = (plate, line) => zoneMask(S.height, [{ r: SZ.plate, o: plate }, { r: SZ.line, o: line }]);
const MASK_SATIN_S = skillMask(.9, 0);
const MASK_GLARE_S = skillMask(1, .25);

// ---------- frame metals ----------
// eng and ops are the proof's two metals verbatim (calibration). The other four are derived from
// the same stack: tinted-white top-left light, dark-tinted bottom-right shade and vignette, four-stop
// vertical metal gradient, same brush/grain tiles, same bevel alphas.
const light = (W, D, a = [.5, .14, .08, .18]) => `linear-gradient(155deg, rgba(${W},${a[0]}) 0%, rgba(${W},${a[1]}) 32%, rgba(${W},0) 50%, rgba(${D},${a[2]}) 74%, rgba(${D},${a[3]}) 100%)`;
const vignette = (D, a = .2, stop = 55) => `radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) ${stop}%, rgba(${D},${a}) 100%)`;
const metal = (a, b, c, d) => `linear-gradient(180deg, ${a} 0%, ${b} 42%, ${c} 74%, ${d} 100%)`;
const plateSet = (W, D, drop, line) => [`rgba(${W},.48)`, `rgba(${W},.24)`, `rgba(${W},.14)`, `rgba(${W},.95)`, `rgba(${D},.48)`, `rgba(${W},.62)`, `rgba(${D},.3)`, drop, line];

const FRAMES = {
  eng: { // brushed silver-white
    base: '#E2E3E7', brush: BRUSH, grain: GRAIN,
    vignette: 'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(40,44,56,.14) 100%)',
    light: 'linear-gradient(155deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.18) 32%, rgba(255,255,255,0) 50%, rgba(22,24,32,.10) 74%, rgba(22,24,32,.24) 100%)',
    metal: metal('#F2F2F4', '#E5E6EA', '#D5D7DD', '#C9CBD2'),
    edge: '#8A8E99', chamfer: 'rgba(255,255,255,.92)', shade: 'rgba(80,84,96,.30)', ridgeL: 'rgba(255,255,255,.98)', ridgeD: 'rgba(60,64,76,.62)',
    ink: '#23262E', inkShadow: 'rgba(255,255,255,.72)',
    plate: ['rgba(255,255,255,.62)', 'rgba(255,255,255,.34)', 'rgba(255,255,255,.22)', 'rgba(255,255,255,1)', 'rgba(70,74,86,.45)', 'rgba(255,255,255,.75)', 'rgba(70,74,86,.28)', 'rgba(40,44,55,.38)', 'rgba(70,74,86,.42)'],
    bezel: ['#FCFCFD', '#D3D5DB', '#9FA3AD', 'rgba(255,255,255,.9)', 'rgba(50,54,64,.45)', 'rgba(50,54,64,.42)'],
    paperLine: '#9C8F78', paperDrop: 'rgba(255,255,255,.6)',
    badge: { rim: ['#FBFBFD', '#8E929E', '#DADCE2', '#4A4E5A'], coin: ['#4E5364', '#2E3240', '#1A1D26'], ink: '#EEF0F5' },
    foil: true, satin: '255,255,255', glare: [.3, .7],
  },
  founder: { // brushed violet
    base: '#A386D1', brush: BRUSH_B, grain: GRAIN_B,
    vignette: vignette('45,22,85'), light: light('240,232,255', '40,20,80'),
    metal: metal('#B49CDE', '#A386D1', '#9A7CC7', '#9070BC'),
    edge: '#4C336F', chamfer: 'rgba(230,220,250,.95)', shade: 'rgba(60,35,100,.28)', ridgeL: 'rgba(236,228,252,.95)', ridgeD: 'rgba(60,35,100,.62)',
    ink: '#0E0A1A', inkShadow: 'rgba(236,228,252,.55)',
    plate: plateSet('242,235,255', '60,35,100', 'rgba(40,20,70,.42)', 'rgba(80,50,130,.52)'),
    bezel: ['#EEE6FA', '#B39BDD', '#5E4290', 'rgba(240,232,255,.85)', 'rgba(40,20,80,.5)', 'rgba(40,20,80,.5)'],
    paperLine: '#5E4A78', paperDrop: 'rgba(236,228,252,.5)',
    badge: { rim: ['#F5EFFF', '#6E4EA0', '#CFBBEC', '#3E2A62'], coin: ['#3C2670', '#251545', '#140A28'], ink: '#F2ECFF' }, // deep violet face, separated from the rim like the other coins
    foil: true, satin: '242,235,255', glare: [.3, .7],
  },
  ops: { // brushed copper-orange
    base: '#D48B45', brush: BRUSH_B, grain: GRAIN_B,
    vignette: vignette('70,30,6'), light: light('255,228,190', '60,25,5'),
    metal: metal('#E4A15E', '#D48B45', '#C67B37', '#B86F2E'),
    edge: '#7E4A1E', chamfer: 'rgba(241,192,140,.95)', shade: 'rgba(90,50,20,.28)', ridgeL: 'rgba(247,205,160,.95)', ridgeD: 'rgba(90,50,20,.62)',
    ink: '#1C0D04', inkShadow: 'rgba(255,226,190,.55)',
    plate: ['rgba(255,232,200,.48)', 'rgba(255,232,200,.24)', 'rgba(255,232,200,.14)', 'rgba(255,238,210,.95)', 'rgba(90,50,20,.48)', 'rgba(255,238,210,.62)', 'rgba(90,50,20,.3)', 'rgba(60,30,10,.42)', 'rgba(110,60,25,.52)'],
    bezel: ['#FADDB8', '#D89A5B', '#8E4F1E', 'rgba(255,232,200,.85)', 'rgba(70,35,10,.5)', 'rgba(70,35,10,.5)'],
    paperLine: '#6F4C28', paperDrop: 'rgba(255,228,190,.5)',
    badge: { rim: ['#FBE0BD', '#9A5A26', '#E4AC72', '#5A3212'], coin: ['#3E62B2', '#1E3A78', '#10224E'], ink: '#EEF2FF' },
    foil: false, satin: '255,240,215', glare: [.24, .5],
  },
  sales: { // brushed gold-tan
    base: '#DEBE6C', brush: BRUSH_B, grain: GRAIN_B,
    vignette: vignette('90,65,15'), light: light('255,246,214', '80,60,12'),
    metal: metal('#EDD48E', '#DEBE6C', '#D2AF5B', '#C6A04C'),
    edge: '#7C5C1E', chamfer: 'rgba(250,236,190,.95)', shade: 'rgba(100,75,20,.28)', ridgeL: 'rgba(252,241,205,.95)', ridgeD: 'rgba(100,75,20,.62)',
    ink: '#1E1506', inkShadow: 'rgba(255,243,208,.55)',
    plate: plateSet('255,246,214', '100,75,20', 'rgba(70,50,10,.42)', 'rgba(120,90,30,.52)'),
    bezel: ['#FBF0CC', '#E3C87C', '#9A7A2E', 'rgba(255,246,214,.85)', 'rgba(80,60,15,.5)', 'rgba(80,60,15,.5)'],
    paperLine: '#7A6030', paperDrop: 'rgba(255,243,208,.5)',
    badge: { rim: ['#FDF2CC', '#9E7E2C', '#E9D18A', '#5E4A18'], coin: ['#B02A3C', '#7C1828', '#4A0C16'], ink: '#FFF1F0' },
    foil: false, satin: '255,247,220', glare: [.24, .5],
  },
  spell: { // brushed green, deepened so its luminance sits with the trap magenta (mint read as a pastel next to it)
    base: '#43926D', brush: BRUSH_B, grain: GRAIN_B,
    vignette: vignette('10,45,30'), light: light('224,248,236', '8,42,28'),
    metal: metal('#5AA383', '#43926D', '#3B8562', '#347858'),
    edge: '#174A33', chamfer: 'rgba(196,236,216,.95)', shade: 'rgba(16,60,38,.28)', ridgeL: 'rgba(210,242,226,.95)', ridgeD: 'rgba(16,60,38,.62)',
    ink: '#08201A', inkShadow: 'rgba(214,244,230,.5)',
    plate: plateSet('228,250,238', '16,60,38', 'rgba(8,42,26,.42)', 'rgba(26,80,54,.52)'),
    bezel: ['#E2F6EA', '#6FB894', '#276A4A', 'rgba(224,248,236,.85)', 'rgba(8,42,28,.5)', 'rgba(8,42,28,.5)'],
    paperLine: '#376350', paperDrop: 'rgba(214,244,230,.5)',
    badge: null, foil: false, satin: '232,255,242', glare: [.24, .5],
  },
  trap: { // brushed magenta
    base: '#C66497', brush: BRUSH_B, grain: GRAIN_B,
    vignette: vignette('80,20,50'), light: light('255,230,242', '70,15,45'),
    metal: metal('#D57AA8', '#C66497', '#B95889', '#AC4D7C'),
    edge: '#5E2242', chamfer: 'rgba(245,200,222,.95)', shade: 'rgba(90,25,60,.28)', ridgeL: 'rgba(250,215,232,.95)', ridgeD: 'rgba(90,25,60,.62)',
    ink: '#26091A', inkShadow: 'rgba(252,222,238,.55)',
    plate: plateSet('255,232,243', '90,25,60', 'rgba(60,15,40,.42)', 'rgba(120,40,80,.52)'),
    bezel: ['#FBE6F0', '#D98CB4', '#7D2F58', 'rgba(255,230,242,.85)', 'rgba(70,15,45,.5)', 'rgba(70,15,45,.5)'],
    paperLine: '#6E3552', paperDrop: 'rgba(252,222,238,.5)',
    badge: null, foil: false, satin: '255,236,246', glare: [.24, .5],
  },
};
function frameCss(name, t) {
  const p = t.plate, b = t.bezel, g = t.badge, c = `.f-${name}`;
  return `
${c} { --edge:${t.edge}; --chamfer:${t.chamfer}; --shade:${t.shade}; --ridge-l:${t.ridgeL}; --ridge-d:${t.ridgeD}; --ink:${t.ink}; --ink-shadow:${t.inkShadow};
  --plate-1:${p[0]}; --plate-2:${p[1]}; --plate-3:${p[2]}; --plate-hi:${p[3]}; --plate-lo:${p[4]}; --plate-hi2:${p[5]}; --plate-lo2:${p[6]}; --plate-drop:${p[7]}; --plate-line:${p[8]};
  --bz-1:${b[0]}; --bz-2:${b[1]}; --bz-3:${b[2]}; --bz-hi:${b[3]}; --bz-lo:${b[4]}; --bz-out:${b[5]};
  --paper-line:${t.paperLine}; --paper-drop:${t.paperDrop}; --satin:${t.satin}; --gl:${t.glare[0]}; --gl-hover:${t.glare[1]}; }
${c} .card-inner { background-color:${t.base}; background-image:${t.brush}, ${t.grain}, ${t.vignette}, ${t.light}, ${t.metal}; }${g ? `
${c} .badge { --rim-1:${g.rim[0]}; --rim-2:${g.rim[1]}; --rim-3:${g.rim[2]}; --rim-dark:${g.rim[3]}; --coin-1:${g.coin[0]}; --coin-2:${g.coin[1]}; --coin-3:${g.coin[2]}; --coin-ink:${g.ink}; }` : ''}`;
}

// ---------- placeholder art (the proof's two artworks, recomposed as 1000x1000 squares) ----------
// The art window is 1.18:1 and crops a square by ~8% top and bottom, so the subject is kept in the middle 70%.
function artNocturne() {
  const R = rng(7), W = 1000, H = 1000, F = { x: 500, y: 430 };
  const nodes = [];
  for (let i = 0; i < 54; i++) {
    let x, y;
    if (R() < 0.5) { x = F.x + (R() + R() - 1) * 580; y = F.y + (R() + R() - 1) * 490; }
    else { x = R() * W; y = R() * H; }
    x = Math.max(-18, Math.min(W + 18, x)); y = Math.max(-18, Math.min(H + 18, y));
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
  for (let i = 0; i < 120; i++) stars += `<circle cx="${f1(R() * W)}" cy="${f1(R() * H * 0.82)}" r="${f1(0.9 + R() * 1.9)}" fill="#fff" opacity="${f1(0.15 + R() * 0.6)}"/>`;
  const glows = layers[2].slice(0, 6).map(n => `<circle cx="${f1(n.x)}" cy="${f1(n.y)}" r="${f1(14 + R() * 14)}" fill="url(#aGlow)"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="aBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070F"/><stop offset=".45" stop-color="#0F1628"/><stop offset=".78" stop-color="#26304A"/><stop offset="1" stop-color="#5B6478"/></linearGradient>
  <radialGradient id="aHalo" cx="${F.x}" cy="${F.y}" r="535" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7FB7E8" stop-opacity=".6"/><stop offset=".35" stop-color="#3E6CA8" stop-opacity=".3"/><stop offset="1" stop-color="#0B1020" stop-opacity="0"/></radialGradient>
  <radialGradient id="aGlow"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset=".3" stop-color="#BFE3FF" stop-opacity=".55"/><stop offset="1" stop-color="#BFE3FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="aFocal"><stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset=".12" stop-color="#DFF3FF" stop-opacity=".9"/><stop offset=".4" stop-color="#7DB9F0" stop-opacity=".3"/><stop offset="1" stop-color="#7DB9F0" stop-opacity="0"/></radialGradient>
  <radialGradient id="aWarm"><stop offset="0" stop-color="#FFF1CC" stop-opacity="1"/><stop offset=".15" stop-color="#FFC46B" stop-opacity=".85"/><stop offset=".5" stop-color="#E08A2E" stop-opacity=".22"/><stop offset="1" stop-color="#E08A2E" stop-opacity="0"/></radialGradient>
  <radialGradient id="aVig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#03050C" stop-opacity=".8"/></radialGradient>
  <linearGradient id="aFog" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#9AA3B5" stop-opacity="0"/><stop offset="1" stop-color="#B7BEC9" stop-opacity=".34"/></linearGradient>
  <pattern id="aHatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="2.3" fill="#000" opacity=".45"/></pattern>
  <filter id="aB3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="aB1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.9"/></filter>
  <filter id="aB6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="11.6"/></filter>
  <mask id="aFade"><rect width="${W}" height="${H}" fill="url(#aFadeG)"/></mask>
  <radialGradient id="aFadeG" cx="${F.x}" cy="${F.y}" r="770" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#aBg)"/>
<rect width="${W}" height="${H}" fill="url(#aHalo)"/>
${stars}
<g mask="url(#aFade)">
  <g filter="url(#aB3)" opacity=".42" stroke="#7B90B8" stroke-width="2.1" fill="#9FB2D6">${lines(layers[0], 3)}${dots(layers[0], 3.2)}</g>
  <g filter="url(#aB1)" opacity=".7" stroke="#A9BBDD" stroke-width="2.1" fill="#C8D5EE">${lines(layers[1], 3)}${dots(layers[1], 3.9)}</g>
  <g stroke="#DCE6F7" stroke-width="2.7" fill="#F2F6FF" opacity=".95">${lines(layers[2], 2)}${dots(layers[2], 5.1)}</g>
  ${glows}
</g>
<circle cx="${F.x}" cy="${F.y}" r="220" fill="url(#aFocal)" filter="url(#aB6)" opacity=".9"/>
<g fill="none" stroke="#CFE6FF" opacity=".7"><circle cx="${F.x}" cy="${F.y}" r="37" stroke-width="2.1"/><circle cx="${F.x}" cy="${F.y}" r="63" stroke-width="1.4" stroke-dasharray="7 9"/><circle cx="${F.x}" cy="${F.y}" r="98" stroke-width="1.15" opacity=".6"/></g>
<circle cx="${F.x}" cy="${F.y}" r="8.3" fill="#fff"/>
<circle cx="${F.x}" cy="${F.y}" r="21" fill="url(#aGlow)"/>
<circle cx="340" cy="630" r="107" fill="url(#aWarm)" opacity=".85"/>
<circle cx="340" cy="630" r="6.5" fill="#FFF3D6"/>
<rect width="${W}" height="${H}" fill="url(#aFog)"/>
<rect width="${W}" height="${H}" fill="url(#aHatch)" opacity=".11"/>
<rect width="${W}" height="${H}" fill="url(#aVig)"/>
</svg>
`;
}
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
function gear(id, cx, cy, R, teeth, { light, dark, spokes = 0, s = 1 } = {}) {
  const ring = gearPath(cx, cy, R, teeth, R * 0.66);
  let g = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(cx - R)}" y1="${f1(cy - R)}" x2="${f1(cx + R * 0.8)}" y2="${f1(cy + R)}"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  g += `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${f1(cx - R)}" y1="${f1(cy - R)}" x2="${f1(cx + R * 0.5)}" y2="${f1(cy + R * 0.6)}"><stop offset="0" stop-color="#FFE7C2" stop-opacity=".95"/><stop offset="1" stop-color="#FFE7C2" stop-opacity="0"/></linearGradient></defs>`;
  g += `<path d="${ring}" fill="url(#${id})" fill-rule="evenodd" stroke="#2A1206" stroke-width="${f1(.8 * s)}" stroke-opacity=".55"/>`;
  g += `<path d="${ring}" fill="none" stroke="url(#${id}h)" stroke-width="${f1(1.2 * s)}" fill-rule="evenodd"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.66)}" fill="none" stroke="#3A1B08" stroke-width="${f1(1.4 * s)}" opacity=".75"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.3)}" fill="url(#${id})"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.3)}" fill="none" stroke="#FFE7C2" stroke-width="${f1(.9 * s)}" opacity=".5"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.11)}" fill="#2A1306"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.11)}" fill="none" stroke="#FFE7C2" stroke-width="${f1(.7 * s)}" opacity=".45"/>`;
  for (let k = 0; k < spokes; k++) {
    const a = (360 / spokes) * k + 18;
    g += `<rect x="${f1(cx - R * 0.055)}" y="${f1(cy - R * 0.66)}" width="${f1(R * 0.11)}" height="${f1(R * 0.4)}" rx="${f1(R * 0.03)}" fill="url(#${id})" transform="rotate(${a} ${cx} ${cy})"/>`;
    g += `<rect x="${f1(cx - R * 0.055)}" y="${f1(cy - R * 0.66)}" width="${f1(R * 0.11)}" height="${f1(R * 0.4)}" rx="${f1(R * 0.03)}" fill="none" stroke="#FFE7C2" stroke-width="${f1(.6 * s)}" opacity=".35" transform="rotate(${a} ${cx} ${cy})"/>`;
    const ra = ((a - 90) * Math.PI) / 180;
    g += `<circle cx="${f1(cx + R * 0.24 * Math.cos(ra))}" cy="${f1(cy + R * 0.24 * Math.sin(ra))}" r="${f1(R * 0.028)}" fill="#FFE1B0" opacity=".8"/>`;
  }
  return g;
}
function artEngine() {
  const R = rng(21), W = 1000, H = 1000, s = 2.326, O = { x: 70, y: 60 };
  let rays = '';
  for (let a = 8; a <= 84; a += 6.5) {
    const r1 = ((a - 1.4) * Math.PI) / 180, r2 = ((a + 1.4) * Math.PI) / 180, L = 1770;
    rays += `<polygon points="${O.x},${O.y} ${f1(O.x + L * Math.cos(r1))},${f1(O.y + L * Math.sin(r1))} ${f1(O.x + L * Math.cos(r2))},${f1(O.y + L * Math.sin(r2))}" fill="#FFF3DC" opacity="${(a / 6.5) % 2 < 1 ? '.13' : '.06'}"/>`;
  }
  const C = { x: 526, y: 575 }; // focal gear
  let sun = '';
  for (let i = 0; i < 36; i++) { const a = (i * 10 * Math.PI) / 180; sun += `<line x1="${f1(C.x + 93 * Math.cos(a))}" y1="${f1(C.y + 93 * Math.sin(a))}" x2="${f1(C.x + 605 * Math.cos(a))}" y2="${f1(C.y + 605 * Math.sin(a))}"/>`; }
  let motes = '';
  for (let i = 0; i < 48; i++) motes += `<circle cx="${f1(R() * W)}" cy="${f1(R() * H)}" r="${f1(1.2 + R() * 4)}" fill="#FFE9C8" opacity="${f1(0.12 + R() * 0.5)}"/>`;
  const shadow = (cx, cy, Rr, t) => `<path d="${gearPath(cx + 12, cy + 19, Rr, t, Rr * 0.66)}" fill="#1E0C03" fill-rule="evenodd" opacity=".55" filter="url(#bB4)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="bBg" cx="${O.x}" cy="${O.y}" r="1300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F6C98A"/><stop offset=".22" stop-color="#D9964F"/><stop offset=".5" stop-color="#8F4E1F"/><stop offset=".8" stop-color="#4A250E"/><stop offset="1" stop-color="#221006" stop-opacity="0"/></radialGradient>
  <radialGradient id="bGlow" cx="${O.x}" cy="${O.y}" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF4E0" stop-opacity=".85"/><stop offset=".3" stop-color="#FFD9A6" stop-opacity=".35"/><stop offset="1" stop-color="#FFD9A6" stop-opacity="0"/></radialGradient>
  <radialGradient id="bVig" cx=".35" cy=".3" r=".9"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1A0A03" stop-opacity=".78"/></radialGradient>
  <radialGradient id="bRayMask" cx="${O.x}" cy="${O.y}" r="1210" gradientUnits="userSpaceOnUse"><stop offset=".05" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="bRM"><rect width="${W}" height="${H}" fill="url(#bRayMask)"/></mask>
  <filter id="bB4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9.3"/></filter>
  <filter id="bB2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5.1"/></filter>
  <pattern id="bHatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="2.3" fill="#000" opacity=".4"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#2A140A"/>
<rect width="${W}" height="${H}" fill="url(#bBg)"/>
<g mask="url(#bRM)" filter="url(#bB2)">${rays}</g>
<g stroke="#FFDCAE" stroke-width="1.4" opacity=".22">${sun}</g>
<g filter="url(#bB4)" opacity=".45">
  <path d="${gearPath(940, 816, 367, 30, 242)}" fill="#3A1C0A" fill-rule="evenodd"/>
  <path d="${gearPath(65, 868, 284, 24, 186)}" fill="#3F1F0C" fill-rule="evenodd"/>
</g>
<g opacity=".92">
  ${gear('bgM1', 749, 351, 223, 22, { light: '#D69A5A', dark: '#5C2F12', spokes: 6, s })}
  ${gear('bgM2', 223, 602, 172, 18, { light: '#C88A4C', dark: '#4E2610', spokes: 5, s })}
</g>
${shadow(C.x, C.y, 167, 16)}
${gear('bgN1', C.x, C.y, 167, 16, { light: '#F3C284', dark: '#6A3512', spokes: 5, s })}
${shadow(786, 700, 88, 11)}
${gear('bgN2', 786, 700, 88, 11, { light: '#EBB06E', dark: '#5E2E10', spokes: 4, s })}
${shadow(367, 305, 74, 10)}
${gear('bgN3', 367, 305, 74, 10, { light: '#F0BB7A', dark: '#63300F', spokes: 3, s })}
<g filter="url(#bB4)" opacity=".5"><rect x="535" y="593" width="349" height="33" rx="9" fill="#1E0C03" transform="rotate(26 535 593)"/></g>
<rect x="526" y="570" width="349" height="28" rx="9" fill="#B5763A" transform="rotate(26 526 570)"/>
<rect x="526" y="570" width="349" height="9" rx="4.5" fill="#F5D2A0" opacity=".8" transform="rotate(26 526 570)"/>
<circle cx="535" cy="579" r="14" fill="#3A1B08"/><circle cx="535" cy="579" r="7.4" fill="#F0C58C"/>
<g stroke="#F3CE9C" stroke-width="2.3" opacity=".38"><line x1="0" y1="844" x2="326" y2="844"/><line x1="0" y1="861" x2="260" y2="861"/><line x1="0" y1="877" x2="195" y2="877"/></g>
<g stroke="#F3CE9C" stroke-width="2.3" opacity=".3"><line x1="1000" y1="198" x2="698" y2="198"/><line x1="1000" y1="214" x2="768" y2="214"/><line x1="1000" y1="230" x2="837" y2="230"/></g>
${motes}
<circle cx="${O.x}" cy="${O.y}" r="700" fill="url(#bGlow)"/>
<rect width="${W}" height="${H}" fill="url(#bHatch)" opacity=".14"/>
<rect width="${W}" height="${H}" fill="url(#bVig)"/>
</svg>
`;
}
const PLACEHOLDER_ART = { anthropic: artNocturne, engine: artEngine };

// ---------- CSS ----------
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+SC:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@400;500;600;700&display=block';
const css = `
:root { color-scheme: dark; --bg: #17181C; --ink: #E9E4DA; --ink-2: #C9C6BE; --muted: #8E9099; --link: #ADAFB6; --gap: 28px; }
* { box-sizing: border-box; }
html, body { margin: 0; overflow-x: clip; }
html { -webkit-text-size-adjust: 100%; }
body {
  min-height: 100vh;
  background-color: var(--bg);
  background-image: radial-gradient(1400px 900px at 50% 0, #2B2C31 0%, #1E1F24 40%, rgba(23,24,28,0) 100%);
  background-repeat: no-repeat;
  color: var(--ink-2);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
}
a { color: var(--link); }
a:focus-visible { outline: 2px solid var(--ink); outline-offset: 4px; border-radius: 2px; }
.wrap { max-width: 1440px; margin: 0 auto; padding: 0 48px; }

/* ---- hero: text block with the portrait set beside it (not pushed to the far edge) ---- */
.hero { display: flex; align-items: flex-start; justify-content: flex-start; gap: 72px; padding-block: 92px 48px; }
.hero-text { max-width: 64ch; }
.hero h1 { margin: 0 0 10px; font-size: clamp(34px, 3.6vw, 46px); line-height: 1.1; font-weight: 600; letter-spacing: -.02em; color: var(--ink); }
.headline { margin: 0 0 28px; font-size: 15.5px; font-weight: 500; color: #A9ABB2; line-height: 1.45; }
.thesis { margin: 0 0 18px; font-size: 25px; line-height: 1.32; font-weight: 500; color: var(--ink); letter-spacing: -.012em; }
.bio { margin: 0 0 28px; font-size: 16.5px; line-height: 1.6; color: var(--ink-2); }
.links { display: flex; flex-wrap: wrap; gap: 10px 24px; margin: 0; padding: 0; list-style: none; }
.links a { color: var(--link); text-decoration: none; font-size: 15px; font-weight: 500; padding-bottom: 2px; border-bottom: 1px solid rgba(173,175,182,.4); }
.links a:hover { color: var(--ink); border-bottom-color: var(--ink); }
.hero-photo { flex: none; width: 200px; height: 200px; margin-top: 6px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 0 rgba(255,255,255,.06), 0 12px 30px -12px rgba(0,0,0,.7); }
.hero-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
/* initials plaque until assets/photo.jpg exists: hairline rim, top-lit, quiet monogram */
.tile {
  width: 100%; height: 100%; display: grid; place-items: center;
  background: radial-gradient(120% 110% at 28% 18%, #35363D 0%, #27282D 62%, #222328 100%);
  box-shadow: inset 0 0 0 1px rgba(233,228,218,.16), inset 0 1px 0 rgba(255,255,255,.07), inset 0 -1px 0 rgba(0,0,0,.35);
  color: #D6D1C6; font-size: 54px; font-weight: 500; letter-spacing: .08em; text-indent: .08em;
}

/* ---- sections ---- */
.section { padding: 36px 0 48px; }
.section h2 { margin: 0 0 24px; font-size: 26px; font-weight: 600; letter-spacing: -.012em; line-height: 1.2; color: var(--ink); }
.group-label { margin: 0 0 18px; font-size: 15px; font-weight: 500; color: #B4B6BC; }
.group + .group { margin-top: 40px; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); align-items: start; }

/* ---- footer: card fine print, items separated by space alone ---- */
.foot { padding-block: 36px 72px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px 40px; }
.fine { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 22px; font-size: 12.5px; font-weight: 500; letter-spacing: .005em; color: var(--muted); line-height: 1.8; }
.foot .links a { font-size: 13px; }

@media (max-width: 1199px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 979px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .wrap { padding: 0 32px; } .hero { padding-top: 64px; gap: 48px; } .hero-photo { width: 160px; height: 160px; } .tile { font-size: 44px; } }
@media (max-width: 599px) {
  :root { --gap: 22px; }
  .wrap { padding: 0 24px; }
  .grid { grid-template-columns: minmax(0, 340px); }
  .hero { flex-direction: column-reverse; gap: 22px; padding-block: 44px 32px; }
  .hero-photo { width: 64px; height: 64px; margin-top: 0; border-radius: 5px; }
  .tile { font-size: 22px; letter-spacing: .1em; text-indent: .1em; }
  .thesis { font-size: 22px; }
  .bio { font-size: 16px; }
  .foot { padding-bottom: 56px; }
}

/* ---- card shell (from the proof; sized by the grid column, cqw units inside) ---- */
.card {
  --mx: 64%; --my: 30%;
  --rx: 0deg; --ry: 0deg;
  --fp: calc(var(--mx) * 1.2 - 10%) calc(var(--my) * 1.2 - 10%);
  --falloff: radial-gradient(farthest-corner circle at var(--mx) var(--my), #000 0%, rgba(0,0,0,.92) 28%, rgba(0,0,0,.55) 62%, rgba(0,0,0,.22) 100%);
  position: relative; width: 100%; margin: 0;
  container-type: inline-size;
  transform: perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform .55s cubic-bezier(.2,.8,.2,1);
}
.card.career { aspect-ratio: 59 / 86; }
.card.is-hover { transition: transform .07s linear; will-change: transform; z-index: 5; }
.card-inner {
  position: relative; width: 100%; height: 100%;
  border-radius: 4.5cqw; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; align-items: stretch;
  padding: ${G.padT}cqw ${G.padX}cqw ${G.padB}cqw;
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
.skill .card-inner { padding: ${S.padT}cqw ${S.padX}cqw ${S.padB}cqw; }
.name, .badge, .kind, .type, .strip, .effect { position: relative; z-index: 3; }
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
${Object.entries(FRAMES).map(([k, t]) => frameCss(k, t)).join('')}

/* ---- name plate (raised, lit top-left) ---- */
.plate {
  position: relative; height: ${G.plate}cqw; margin-bottom: ${G.plateMb}cqw; flex: none;
  display: flex; align-items: center; justify-content: space-between; gap: ${G.plateGap}cqw;
  padding: 0 ${G.platePadR}cqw 0 ${G.platePadL}cqw; border-radius: 1.2cqw;
  background: linear-gradient(180deg, var(--plate-1), var(--plate-2) 55%, var(--plate-3));
  box-shadow:
    inset 0 1px 0 var(--plate-hi), inset 1px 0 0 var(--plate-hi2),
    inset 0 -1px 0 var(--plate-lo), inset -1px 0 0 var(--plate-lo2),
    0 1px 1px var(--plate-drop), 1px 1px 0 var(--plate-drop), 0 0 0 1px var(--plate-line);
}
.name {
  margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: visible;
  font-family: "Cormorant SC", "Cormorant", Georgia, serif; font-weight: 600; font-size: var(--nfs, ${G.nameFs}cqw); line-height: 1;
  letter-spacing: ${G.nameTracking}em; color: var(--ink); text-shadow: 0 1px 0 var(--ink-shadow);
  padding-bottom: .3cqw;
}
.name > span { display: inline-block; transform-origin: 0 50%; transform: scaleX(var(--cond, 1)); }
/* ---- badge: struck coin, rim in the card's own metal ---- */
.badge {
  flex: none; position: relative; width: ${G.badge}cqw; height: ${G.badge}cqw; border-radius: 50%;
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
/* longer badge words stay inside the struck face (face is 78% of the coin; word kept under ~88% of it) */
.badge.mid { font-size: 1.8cqw; letter-spacing: .06em; text-indent: .06em; }
.badge.long { font-size: 1.4cqw; letter-spacing: .02em; text-indent: .02em; }
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
/* ---- skill type mark, right-aligned in the plate ---- */
.kind {
  flex: none; font-family: "EB Garamond", Georgia, serif; font-weight: 700; font-size: ${S.kindFs}cqw; line-height: 1;
  color: var(--ink); letter-spacing: .01em; padding-right: 1cqw; white-space: nowrap;
}

/* ---- art window: raised metallic lip, art set into it ---- */
.art {
  position: relative; height: ${G.art}cqw; margin-bottom: ${G.artMb}cqw; flex: none;
  border-radius: 1.1cqw;
  background: linear-gradient(145deg, var(--bz-1) 0%, var(--bz-2) 40%, var(--bz-3) 100%);
  box-shadow:
    inset 1px 1px 0 var(--bz-hi), inset -1px -1px 0 var(--bz-lo),
    0 0 0 1px var(--bz-out), 0 1px 2px rgba(0,0,0,.28), 1px 1px 0 var(--bz-out);
}
.art-inner { position: absolute; inset: .95cqw; border-radius: .5cqw; overflow: hidden; background: #0B0F1C; }
.art-img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; }
/* recess shadow kept light so the top of the artwork is not darkened */
.art-inner::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow:
    inset 0 2px 3px rgba(0,0,0,.45), inset 0 1px 0 rgba(0,0,0,.55),
    inset 2px 0 3px rgba(0,0,0,.3), inset -1px 0 3px rgba(0,0,0,.22), inset 0 -1px 3px rgba(0,0,0,.22),
    inset 0 -1px 0 rgba(255,255,255,.14),
    inset 0 0 0 1px rgba(0,0,0,.55);
}
/* ---- company mark: white monochrome, about 13% of card width, bottom-right inside the window, under the foil.
   Wordmarks (Deel) get a 15cqw-wide box so their ink mass stays close to the square glyphs. ---- */
.logo {
  position: absolute; right: 2.6cqw; bottom: 2.4cqw; width: 13cqw; height: 13cqw;
  object-fit: contain; object-position: right bottom; opacity: .92;
  filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.6)) drop-shadow(0 0 5px rgba(0,0,0,.45));
}
.logo.wide { width: 15cqw; height: 6cqw; }
/* ---- type line ---- */
.type {
  height: ${G.type}cqw; margin: 0 0 ${G.typeMb}cqw; flex: none; white-space: nowrap; overflow: hidden; padding-left: .2cqw;
  font-family: "EB Garamond", Georgia, serif; font-weight: 700; font-size: var(--tfs, ${G.typeFs}cqw); line-height: ${G.type}cqw;
  color: var(--ink); letter-spacing: .004em;
}
/* ---- effect box (paper set into the frame) ---- */
.effect {
  height: ${G.effect}cqw; margin-bottom: ${G.effectMb}cqw; flex: none; padding: ${G.effectPadT}cqw ${G.effectPadX}cqw ${G.effectPadB}cqw;
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
  font-family: "EB Garamond", Georgia, serif; font-size: var(--efs, ${G.effectFs}cqw); line-height: ${G.effectLh};
  text-align: left; hyphens: manual; text-wrap: pretty;
}
.effect p { margin: 0; }
.effect.line { height: ${S.line}cqw; margin-bottom: 0; padding: 0 ${S.linePadX}cqw; display: flex; align-items: center; overflow: hidden; font-size: var(--efs, ${S.lineFs}cqw); }
.effect.line p { white-space: nowrap; }
/* ---- bottom strip ---- */
.strip {
  height: ${G.strip}cqw; flex: none; display: flex; justify-content: space-between; align-items: center; padding: 0 .3cqw;
  font: 600 ${G.stripFs}cqw/1 Inter, system-ui, sans-serif; letter-spacing: .09em; text-transform: uppercase;
  color: var(--ink);
}

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
  -webkit-mask-size: ${f2(CZ.art.w)}cqw ${f2(CZ.art.h)}cqw; mask-size: ${f2(CZ.art.w)}cqw ${f2(CZ.art.h)}cqw;
  -webkit-mask-position: ${f2(CZ.art.x)}cqw ${f2(CZ.art.y)}cqw; mask-position: ${f2(CZ.art.x)}cqw ${f2(CZ.art.y)}cqw;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  transition: background-position .55s cubic-bezier(.2,.8,.2,1);
}
/* matte cards: satin band in the card's own metal (no rainbow) */
.satin {
  background-image: linear-gradient(115deg,
    rgba(var(--satin),0) 44%, rgba(var(--satin),.16) 49%, rgba(var(--satin),.42) 52.5%, rgba(var(--satin),.5) 53.2%, rgba(var(--satin),.16) 57%, rgba(var(--satin),0) 62%);
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
.skill .satin { -webkit-mask-image: ${MASK_SATIN_S}; mask-image: ${MASK_SATIN_S}; }
.skill .glare { -webkit-mask-image: ${MASK_GLARE_S}; mask-image: ${MASK_GLARE_S}; }
.card.is-hover .glare { opacity: var(--gl-hover); }
.card.is-hover .foil, .card.is-hover .sheen, .card.is-hover .prism, .card.is-hover .glitter, .card.is-hover .satin, .card.is-hover .glare { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .card { transform: none !important; transition: none; }
  .foil, .sheen, .prism, .glitter, .satin, .glare { transition: none; }
}

/* ---- qa close-up ---- */
body.detail { padding: 42px 24px; display: flex; justify-content: center; align-items: flex-start; }
body.detail .card { width: 720px; }
`;

// ---------- markup ----------
function careerCard(card, rel) {
  const t = FRAMES[card.frame];
  if (!t) throw new Error(`Unknown frame "${card.frame}" on card ${card.id}`);
  const art = exists(card.art) ? card.art : card.artPlaceholder;
  const typeLine = `[ ${card.company} / ${card.city} / ${card.dates} ]`;
  const nameAvail = G.inner - G.platePadL - G.platePadR - G.plateGap - G.badge;
  const name = nameFit(card.name, nameAvail);
  const nameStyle = [name.fs !== G.nameFs ? `--nfs:${name.fs}cqw` : '', name.cond < 1 ? `--cond:${name.cond}` : ''].filter(Boolean).join(';');
  const efs = effectSize(card.text);
  const tfs = typeSize(typeLine);
  const foil = card.foil && t.foil;
  const badgeCls = card.badge.length >= 7 ? ' long' : card.badge.length >= 5 ? ' mid' : '';
  const logoCls = card.logoWide ? ' wide' : '';
  const layers = foil
    ? '<div class="foil"></div><div class="sheen"></div><div class="prism"></div><div class="glitter"></div><div class="glare"></div>'
    : '<div class="satin"></div><div class="glare"></div>';
  return `
<article class="card career f-${card.frame}${foil ? ' foil-card' : ''}" data-tilt="${foil ? 10 : 6}">
  <div class="card-inner">
    <header class="plate">
      <h3 class="name"${nameStyle ? ` style="${nameStyle}"` : ''}><span>${esc(card.name)}</span></h3>
      <span class="badge${badgeCls}">${esc(card.badge)}</span>
    </header>
    <div class="art"><div class="art-inner"><img class="art-img" src="${rel}${esc(art)}" alt=""><img class="logo${logoCls}" src="${rel}${esc(card.logo)}" alt="${esc(card.logoAlt)}"></div></div>
    <p class="type"${tfs !== G.typeFs ? ` style="--tfs:${tfs}cqw"` : ''}>${esc(typeLine)}</p>
    <div class="effect"${efs !== G.effectFs ? ` style="--efs:${efs}cqw"` : ''}><p>${esc(card.text)}</p></div>
    <footer class="strip"><span class="set">${esc(card.setCode)}</span><span class="copy">${esc(content.footer.copyright)}</span></footer>
    ${layers}
  </div>
</article>`;
}
const SKILL_LINE_FS = skillLineSize(Object.values(content.skills).flatMap(g => g.items.map(i => i.text)));
function skillCard(item, type) {
  const kind = `[ ${type[0].toUpperCase()}${type.slice(1)} ]`;
  const kindW = emWidth(METRICS.ebg700, kind, 0.01) * S.kindFs + 1; // + padding-right
  const nameAvail = (100 - 2 * S.padX) - G.platePadL - G.platePadR - G.plateGap - kindW;
  const name = nameFit(item.name, nameAvail);
  const nameStyle = [name.fs !== G.nameFs ? `--nfs:${name.fs}cqw` : '', name.cond < 1 ? `--cond:${name.cond}` : ''].filter(Boolean).join(';');
  const efs = SKILL_LINE_FS;
  return `
<article class="card skill f-${type}" data-tilt="6">
  <div class="card-inner">
    <header class="plate">
      <h4 class="name"${nameStyle ? ` style="${nameStyle}"` : ''}><span>${esc(item.name)}</span></h4>
      <span class="kind">${esc(kind)}</span>
    </header>
    <div class="effect line"${efs !== S.lineFs ? ` style="--efs:${efs}cqw"` : ''}><p>${esc(item.text)}</p></div>
    <div class="satin"></div><div class="glare"></div>
  </div>
</article>`;
}
const linksList = (links, cls) => `<ul class="links${cls ? ' ' + cls : ''}">${links.map(l => `<li><a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' rel="me noopener"' : ''}>${esc(l.label)}</a></li>`).join('')}</ul>`;

function hero(site) {
  const photo = exists(site.photo)
    ? `<img src="${esc(site.photo)}" alt="${esc(site.photoAlt)}" width="200" height="200">`
    : `<div class="tile" aria-hidden="true">${esc(initials(site.name))}</div>`;
  return `
<header class="hero wrap">
  <div class="hero-text">
    <h1>${esc(site.name)}</h1>
    <p class="headline">${esc(site.headline)}</p>
    <p class="thesis">${esc(site.thesis)}</p>
    <p class="bio">${esc(site.body)}</p>
    <nav aria-label="Profile links">${linksList(site.links)}</nav>
  </div>
  <div class="hero-photo">${photo}</div>
</header>`;
}
function skillGroup(group, id) {
  return `
<div class="group">
  <h3 class="group-label" id="${id}">${esc(group.label)}</h3>
  <div class="grid">${group.items.map(i => skillCard(i, group.type)).join('')}
  </div>
</div>`;
}
function footer(f, links) {
  return `
<footer class="foot wrap">
  <p class="fine"><span>${esc(f.setCode)}</span><span>${esc(f.copyright)}</span><span>${esc(f.note)}</span></p>
  <nav aria-label="Profile links, footer">${linksList(links)}</nav>
</footer>`;
}

// ---------- script: measured fit after fonts load, then pointer tilt (mouse/pen only) ----------
const js = `
(function(){
  var mm = window.matchMedia ? function(q){ return matchMedia(q).matches; } : function(){ return false; };
  var NFS = ${G.nameFs}, NFS_MIN = ${G.nameFsMin}, COND_MIN = ${G.nameCondMin};
  function fit(){
    document.querySelectorAll('.card').forEach(function(card){
      var W = card.clientWidth / 100; if (!W) return;
      card.querySelectorAll('.name').forEach(function(h){
        var s = h.firstElementChild; if (!s) return;
        s.style.transform = 'none'; h.style.setProperty('--nfs', NFS + 'cqw');
        var w = s.getBoundingClientRect().width, a = h.clientWidth;
        s.style.transform = '';
        if (!(w > 0)) return;
        var r = a / w, fs = NFS;
        if (r < COND_MIN) { fs = Math.max(NFS_MIN, NFS * r / COND_MIN); r = Math.min(1, r * NFS / fs); }
        h.style.setProperty('--nfs', fs.toFixed(2) + 'cqw');
        h.style.setProperty('--cond', r < 1 ? r.toFixed(3) : '1');
      });
      var e = card.querySelector('.effect'); if (!e) return;
      var p = e.firstElementChild, fs = parseFloat(getComputedStyle(e).fontSize) / W, n = 0;
      var over = e.classList.contains('line') ? function(){ return p.scrollWidth > p.clientWidth + 1; } : function(){ return e.scrollHeight > e.clientHeight + 1; };
      while (over() && fs > 2.4 && n++ < 14) { fs -= .1; e.style.setProperty('--efs', fs.toFixed(2) + 'cqw'); }
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else fit();

  if (mm('(prefers-reduced-motion: reduce)') || mm('(pointer: coarse)')) return;
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
      if (e.pointerType === 'touch') return;
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

// ---------- pages ----------
function head(title, description) {
  return `<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#17181C">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS_HREF}" rel="stylesheet">
<style>${css}</style>`;
}
function indexPage() {
  const { site, cards, skills } = content;
  return `<!doctype html>
<html lang="en">
<head>
${head(site.title, site.thesis)}
</head>
<body>
${hero(site)}
<main class="wrap">
<section class="section" aria-labelledby="experience-h">
  <h2 id="experience-h">${esc(content.experienceHeading)}</h2>
  <div class="grid">${cards.map(c => careerCard(c, '')).join('')}
  </div>
</section>
<section class="section" aria-labelledby="skills-h">
  <h2 id="skills-h">${esc(content.skillsHeading)}</h2>${Object.entries(skills).map(([k, g]) => skillGroup(g, `skills-${k}`)).join('')}
</section>
</main>
${footer(content.footer, site.links)}
<script>${js}</script>
</body>
</html>
`;
}
function detailPage() {
  const card = content.cards[0];
  return `<!doctype html>
<html lang="en">
<head>
${head(`${content.site.title} - card detail`, card.name)}
</head>
<body class="detail">
<main>${careerCard(card, '../')}
</main>
<script>${js}</script>
</body>
</html>
`;
}

// ---------- write ----------
const written = [];
function write(rel, data) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, data);
  written.push(`${rel} (${(Buffer.byteLength(data) / 1024).toFixed(1)} KB)`);
}
for (const card of content.cards) {
  const draw = PLACEHOLDER_ART[card.id];
  if (draw) write(card.artPlaceholder, draw());
}
write('index.html', indexPage());
write('qa/detail.html', detailPage());
const missing = content.cards.filter(c => !exists(c.art) && !exists(c.artPlaceholder)).map(c => c.artPlaceholder);
console.log('wrote ' + written.join(', '));
console.log(`art: ${content.cards.filter(c => exists(c.art)).length}/${content.cards.length} final, hero photo ${exists(content.site.photo) ? 'present' : 'missing (initials tile)'}`);
if (missing.length) console.log('placeholders not yet drawn: ' + missing.join(', '));
