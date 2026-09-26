#!/usr/bin/env node
/**
 * build-covers-2.mjs — thirty more Pinterest pin cover templates, 1000x1500.
 *
 * Same contract as build-covers.mjs (read its header): tokens only, real brand copy,
 * empty heading zones, no buttons or anything else that pretends to be clickable.
 *
 * The difference: these thirty are allowed a LITTLE invention. Elements that are not on
 * the landing page but stay inside the identity — review stars drawn in CSS, tape strips
 * (the taped-note motif from /ig-grid-widget-notion), browser-window chrome around a
 * screenshot, a blank month grid, checklist rows, editorial numerals, scalloped band
 * edges, a dot grid, arch photo frames, a speech bubble, vertical ticker rails,
 * polaroid frames, the section-band rhythm as stripes. Every one of them is set in the
 * two brand faces and the ten token colours; nothing new was added to either.
 *
 *     node "landing-page-covers/build-covers-2.mjs"
 */

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SALESPAGE = '/Users/ivankitanovski/source/templatesbygabi-salespage';
const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));

const { chromium } = createRequire(path.join(SALESPAGE, 'package.json'))('playwright');

const FONT_DIR = path.join(SALESPAGE, 'app', 'fonts');
const IMG_DIR = path.join(SALESPAGE, 'public', 'images');

const PIN = { width: 800, height: 1200 };
const BAND_H = 83;
const SCALE = 1.25; // 1000x1500 out, Pinterest's recommended minimum width

/* ----------------------------------------------------------------------- assets */

async function fontFace(family, file, extra = '') {
  const buf = await fs.readFile(path.join(FONT_DIR, file));
  return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${buf.toString(
    'base64',
  )}) format('woff2');font-display:block;${extra}}`;
}

async function dataUri(file) {
  const buf = await fs.readFile(path.join(IMG_DIR, file));
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${buf.toString('base64')}`;
}

let FACES;
async function faces() {
  FACES ??= [
    await fontFace('Playfair', 'PlayfairDisplay-Variable-latin.woff2', 'font-weight:300 900;'),
    await fontFace(
      'Playfair',
      'PlayfairDisplay-Italic-Variable-latin.woff2',
      'font-weight:300 900;font-style:italic;',
    ),
    await fontFace('Questrial', 'Questrial-Regular-latin.woff2', 'font-weight:400;'),
  ].join('');
  return FACES;
}

/* ------------------------------------------------------------------- shared css */

const BASE = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${PIN.width}px;height:${PIN.height}px;background:#fcfcfa;overflow:hidden;position:relative}
  .band{height:${BAND_H}px;display:flex;align-items:center;overflow:hidden;
    white-space:nowrap;flex:none}
  .band.center{justify-content:center}
  .band span,.caps{font-family:Questrial;font-size:13px;line-height:1.4;letter-spacing:.1em;
    text-transform:uppercase}
  .lavender{background:#e8e5fc}
  .lavender span{color:#333}
  .ink{background:#333}
  .ink span{color:#fcfcfa}
  .caps{color:#333}
  .shadowed{box-shadow:6.5px 11.3px 19px 0 #0000001c}

  /* a five-point star, drawn rather than typed — the latin font subsets have no glyph */
  .stars{display:flex;gap:8px;justify-content:center}
  .star{width:28px;height:28px;background:#000;
    clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
  .star.paper{background:#fcfcfa}

  /* tape strip — the taped-note motif */
  .tape{position:absolute;width:150px;height:44px;background:#e8e5fc;opacity:.85}
`;

const ticker = (text) => Array.from({ length: 20 }, () => text).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

const shell = async (css, body) =>
  `<!doctype html><meta charset="utf-8"><style>${await faces()}${BASE}${css}</style>${body}`;

const T_FIRST_CLASS = 'First class templates for first-class business owners';
const T_CLIENT_LOVE = 'Client love';
const T_ON_THE_BLOG = 'On the blog';
const WORDMARK = 'templatesbygabi.com';
const EYEBROW_HERO = 'Time-saving products for busy service providers';
const EYEBROW_FREEBIE = "Now let's get you a freebie!";
const EYEBROW_ABOUT = 'Your small business and marketing sidekick';

const byline = (cls = 'lavender') =>
  `<div class="band ${cls} center byline"><span>${WORDMARK}</span></div>`;
const BYLINE_CSS = `.byline{position:absolute;left:0;right:0;bottom:0}`;

const STARS = (n = 5, cls = '') =>
  `<div class="stars">${Array.from({ length: n }, () => `<div class="star ${cls}"></div>`).join('')}</div>`;

/* ------------------------------------------------------------------- the thirty */

const COVERS = [
  /* 1 — five black stars on a white review card; the quotation is the heading zone. */
  [
    'stars-card-paper.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:620px;height:800px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c;display:flex;flex-direction:column;
      align-items:center;padding:64px 56px 56px;text-align:center}
    .rule{width:140px;border-top:1px solid #d7d7d7;margin:28px 0}
  `,
        `
  <div class="band lavender"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  <div class="card">
    ${STARS()}
    <div style="flex:1"></div>
    <div class="rule"></div>
    <div class="caps">Review from customer</div>
  </div>
  ${byline()}`,
      ),
  ],

  /* 2 — the same review anatomy straight onto ink, stars in paper. */
  [
    'stars-ink.png',
    () =>
      shell(
        `
    body{background:#333}
    .top{margin-top:150px}
    .foot{position:absolute;left:0;right:0;bottom:${BAND_H + 48}px;display:flex;
      flex-direction:column;align-items:center;gap:24px}
    .foot .rule{width:140px;border-top:1px solid #d7d7d7}
    .foot .caps{color:#fcfcfa}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band ink"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  <div class="top">${STARS(5, 'paper')}</div>
  <div class="foot"><div class="rule"></div><div class="caps">Review from customer</div></div>
  <div class="band ink byline"><span>${ticker(T_CLIENT_LOVE)}</span></div>`,
      ),
  ],

  /* 3 — a taped note: tilted white card held by two lavender tape strips. */
  [
    'taped-note-blush.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .note{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-2deg);
      width:620px;height:820px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .t1{transform:rotate(-45deg);left:52px;top:118px}
    .t2{transform:rotate(45deg);right:52px;top:98px}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="note"></div>
  <div class="tape t1"></div>
  <div class="tape t2"></div>
  ${byline()}`,
      ),
  ],

  /* 4 — a taped photograph, heading zone beneath it. */
  [
    'taped-photo-paper.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    .shot{position:absolute;left:50%;top:150px;transform:translateX(-50%) rotate(2deg);
      width:620px;height:460px;object-fit:cover;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .t1{transform:rotate(-45deg);left:70px;top:128px}
    .t2{transform:rotate(45deg);right:70px;top:108px}
  `,
        `
  <div class="band lavender"><span>${ticker(T_ON_THE_BLOG)}</span></div>
  <img class="shot" src="${await dataUri('ig/couch-laptop.jpg')}">
  <div class="tape t1"></div>
  <div class="tape t2"></div>
  ${byline()}`,
      ),
  ],

  /* 5 — a planner screenshot inside browser-window chrome on lavender. */
  [
    'browser-planner-lavender.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    body{background:#e8e5fc}
    .win{position:absolute;left:50%;top:96px;transform:translateX(-50%);width:660px;
      background:#fff;border-radius:24px;overflow:hidden;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .chrome{height:52px;border-bottom:1px solid #d7d7d7;display:flex;align-items:center;
      gap:10px;padding:0 24px}
    .dot{width:12px;height:12px;border-radius:9999px;background:#e8e6e6}
    .win img{display:block;width:100%;height:400px;object-fit:cover;object-position:top}
  `,
        `
  <div class="win">
    <div class="chrome"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    <img src="${await dataUri('shop/content-marketing-planner/09-content-notebook.webp')}">
  </div>
  ${byline('ink')}`,
      ),
  ],

  /* 6 — an empty browser window: the whole page is the heading zone. */
  [
    'browser-blank-paper.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .win{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:660px;
      height:860px;background:#fff;border-radius:24px;overflow:hidden;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .chrome{height:52px;border-bottom:1px solid #d7d7d7;display:flex;align-items:center;
      gap:10px;padding:0 24px}
    .dot{width:12px;height:12px;border-radius:9999px;background:#e8e6e6}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="win">
    <div class="chrome"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  </div>
  ${byline()}`,
      ),
  ],

  /* 7 — a blank month on a card, one day highlighted lavender: the content-planning
     motif without a single word of UI. Heading zone above the card. */
  [
    'calendar-blush.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .card{position:absolute;left:50%;bottom:${BAND_H + 64}px;transform:translateX(-50%);
      width:620px;background:#fff;border-radius:24px;padding:32px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#d7d7d7;
      border:1px solid #d7d7d7;border-radius:0}
    .cell{background:#fff;height:64px}
    .cell.hot{background:#e8e5fc}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="card">
    <div class="grid">${Array.from(
      { length: 35 },
      (_, i) => `<div class="cell${i === 16 ? ' hot' : ''}"></div>`,
    ).join('')}</div>
  </div>
  ${byline()}`,
      ),
  ],

  /* 8 — checklist rows: square, hairline, repeat; the first box ticked. The heading
     zone is above, and the rows are there to be typed over. */
  [
    'checklist-card.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .card{position:absolute;left:50%;bottom:${BAND_H + 64}px;transform:translateX(-50%);
      width:620px;background:#fff;border-radius:24px;padding:56px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c;display:flex;flex-direction:column;gap:44px}
    .row{display:flex;align-items:center;gap:24px}
    .box{width:32px;height:32px;border:1px solid #333;flex:none}
    .box.done{background:#e8e5fc;position:relative}
    .box.done:after{content:'';position:absolute;left:10px;top:4px;width:8px;height:16px;
      border-right:2px solid #333;border-bottom:2px solid #333;transform:rotate(45deg)}
    .line{flex:1;border-top:1px solid #d7d7d7}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="card">
    <div class="row"><div class="box done"></div><div class="line"></div></div>
    <div class="row"><div class="box"></div><div class="line"></div></div>
    <div class="row"><div class="box"></div><div class="line"></div></div>
    <div class="row"><div class="box"></div><div class="line"></div></div>
  </div>
  ${byline()}`,
      ),
  ],

  /* 9 — an editorial numeral: Playfair italic 01. and a hairline, listicle cover. */
  [
    'numeral-01.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .num{font-family:Playfair;font-style:italic;font-size:60px;line-height:1.1;color:#000;
      margin:150px 0 0 76px}
    .rule{width:140px;border-top:1px solid #d7d7d7;margin:40px 0 0 76px}
  `,
        `
  <div class="band lavender"><span>${ticker(T_ON_THE_BLOG)}</span></div>
  <div class="num">01.</div>
  <div class="rule"></div>
  ${byline()}`,
      ),
  ],

  /* 10 — three numbered rows, a list template on blush. */
  [
    'numeral-listicle.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .list{position:absolute;left:76px;right:76px;top:380px;display:flex;
      flex-direction:column;gap:120px}
    .row{display:flex;align-items:baseline;gap:32px}
    .row .n{font-family:Playfair;font-style:italic;font-size:40px;line-height:1.3;color:#000}
    .row .line{flex:1;border-top:1px solid #d7d7d7;transform:translateY(-8px)}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="list">
    <div class="row"><div class="n">01.</div><div class="line"></div></div>
    <div class="row"><div class="n">02.</div><div class="line"></div></div>
    <div class="row"><div class="n">03.</div><div class="line"></div></div>
  </div>
  ${byline()}`,
      ),
  ],

  /* 11 — a lavender band rising into the page with a scalloped edge. */
  [
    'scallop-lavender.png',
    () =>
      shell(
        `
    .zone{height:760px}
    .scallop{height:48px;background:radial-gradient(circle 24px at 24px 48px,#e8e5fc 24px,#fcfcfa 25px);
      background-size:48px 48px}
    .fill{position:absolute;left:0;right:0;bottom:0;top:${83 + 760 + 48}px;background:#e8e5fc}
    .fill .caps{display:block;text-align:center;margin-top:56px}
    .byline{position:absolute;left:0;right:0;bottom:0;background:none;justify-content:center}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="zone"></div>
  <div class="scallop"></div>
  <div class="fill"><span class="caps">${EYEBROW_HERO}</span></div>
  <div class="band center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 12 — the inverse: a blush header with a scalloped hem, eyebrow inside it. */
  [
    'scallop-blush-top.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .head{height:360px;background:#f7f2ef;display:flex;align-items:center;
      justify-content:center}
    .scallop{height:48px;background:radial-gradient(circle 24px at 24px 0,#f7f2ef 24px,#fcfcfa 25px);
      background-size:48px 48px}
  `,
        `
  <div class="head"><span class="caps">${EYEBROW_FREEBIE}</span></div>
  <div class="scallop"></div>
  ${byline()}`,
      ),
  ],

  /* 13 — an ink/20 dot grid behind a white card. */
  [
    'dot-grid-card.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background-image:radial-gradient(#33333333 2px,transparent 2.5px);
      background-size:36px 36px}
    .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:600px;height:820px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
  `,
        `
  <div class="card"></div>
  ${byline()}`,
      ),
  ],

  /* 14 — the portrait in an arch frame on blush. */
  [
    'arch-portrait-blush.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .arch{display:block;margin:96px auto 0;width:480px;height:600px;object-fit:cover;
      object-position:center 12%;border-radius:240px 240px 24px 24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
  `,
        `
  <img class="arch" src="${await dataUri('gabi-portrait.jpg')}">
  ${byline()}`,
      ),
  ],

  /* 15 — the books in an arch on lavender. */
  [
    'arch-books-lavender.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    body{background:#e8e5fc}
    .arch{display:block;margin:96px auto 0;width:480px;height:600px;object-fit:cover;
      object-position:center 55%;border-radius:240px 240px 24px 24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
  `,
        `
  <img class="arch" src="${await dataUri('juicy-question.jpg')}">
  ${byline('ink')}`,
      ),
  ],

  /* 16 — a speech bubble carrying five stars; what it says is the heading. */
  [
    'speech-bubble.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .bubble{position:absolute;left:50%;top:180px;transform:translateX(-50%);
      width:620px;height:680px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c;display:flex;flex-direction:column;
      align-items:center;padding-top:64px}
    .tail{position:absolute;left:200px;top:840px;width:56px;height:56px;background:#fff;
      transform:rotate(45deg);box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .cover{position:absolute;left:180px;top:800px;width:120px;height:60px;background:#fff}
    .attr{position:absolute;left:0;right:0;bottom:${BAND_H + 56}px;text-align:center}
  `,
        `
  <div class="band ink"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  <div class="tail"></div>
  <div class="bubble">${STARS()}</div>
  <div class="cover"></div>
  <div class="attr"><span class="caps">Review from customer</span></div>
  ${byline()}`,
      ),
  ],

  /* 17 — a lavender circle stamped FREE, the badge redrawn in the system. */
  [
    'circle-free-blush.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .seal{position:absolute;right:64px;top:140px;width:220px;height:220px;
      border-radius:9999px;background:#e8e5fc;display:flex;align-items:center;
      justify-content:center;transform:rotate(8deg)}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="seal"><span class="caps">Free</span></div>
  ${byline()}`,
      ),
  ],

  /* 18 — a vertical ticker rail down the left, photo card top right. */
  [
    'side-rail-lavender.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    .rail{position:absolute;left:0;top:0;width:${PIN.height}px;height:${BAND_H}px;
      transform-origin:top left;transform:rotate(90deg) translateY(-${BAND_H}px);
      background:#e8e5fc;display:flex;align-items:center;overflow:hidden;white-space:nowrap}
    .rail span{font-family:Questrial;font-size:13px;line-height:1.4;letter-spacing:.1em;
      text-transform:uppercase;color:#333}
    .shot{position:absolute;left:143px;top:60px;width:560px;height:420px;object-fit:cover;
      border-radius:24px;box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .byline{left:${BAND_H}px}
  `,
        `
  <div class="rail"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <img class="shot" src="${await dataUri('ig/steps-laptop.jpg')}">
  ${byline()}`,
      ),
  ],

  /* 19 — an ink rail down the right, otherwise open paper. */
  [
    'side-rail-ink.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .rail{position:absolute;left:${PIN.width - BAND_H}px;top:0;width:${PIN.height}px;
      height:${BAND_H}px;transform-origin:top left;
      transform:rotate(90deg) translateY(-${BAND_H}px);background:#333;display:flex;
      align-items:center;overflow:hidden;white-space:nowrap}
    .rail span{font-family:Questrial;font-size:13px;line-height:1.4;letter-spacing:.1em;
      text-transform:uppercase;color:#fcfcfa}
    .byline{right:${BAND_H}px}
  `,
        `
  <div class="rail"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  ${byline()}`,
      ),
  ],

  /* 20 — two polaroids on mist, captions left blank for handwriting. */
  [
    'polaroid-duo-mist.png',
    async () => {
      const [a, b] = await Promise.all([
        dataUri('gabi-portrait.jpg'),
        dataUri('juicy-question.jpg'),
      ]);
      return shell(
        `${BYLINE_CSS}
    body{background:#e8e6e6}
    .pol{position:absolute;width:360px;background:#fff;padding:16px 16px 72px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .pol img{display:block;width:100%;height:340px;object-fit:cover}
    .p1{left:56px;top:560px;transform:rotate(-4deg)}
    .p2{right:56px;top:640px;transform:rotate(3deg)}
  `,
        `
  <div class="band lavender"><span>${ticker(T_ON_THE_BLOG)}</span></div>
  <div class="pol p1"><img src="${a}"></div>
  <div class="pol p2"><img src="${b}"></div>
  ${byline()}`,
      );
    },
  ],

  /* 21 — lavender heading half over the silk photograph. */
  [
    'split-lavender-silk.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    .head{height:560px;background:#e8e5fc;display:flex;flex-direction:column;
      align-items:center;padding-top:72px}
    .photo{position:absolute;left:0;right:0;top:560px;bottom:${BAND_H}px}
    .photo img{width:100%;height:100%;object-fit:cover;display:block}
  `,
        `
  <div class="head"><span class="caps">${EYEBROW_HERO}</span></div>
  <div class="photo"><img src="${await dataUri('ig/silk.jpg')}"></div>
  ${byline('ink')}`,
      ),
  ],

  /* 22 — a hairline frame with a Playfair ampersand as its only ornament. */
  [
    'ampersand-frame.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .frame{position:absolute;left:60px;right:60px;top:${BAND_H + 60}px;
      bottom:${BAND_H + 60}px;border:1px solid #d7d7d7;display:flex;
      flex-direction:column;align-items:center;padding-top:56px}
    .amp{font-family:Playfair;font-style:italic;font-size:60px;line-height:1.1;color:#000}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="frame"><div class="amp">&amp;</div></div>
  ${byline()}`,
      ),
  ],

  /* 23 — the three planner views as vertical strips, heading zone beneath. */
  [
    'photo-strips.png',
    async () => {
      const shots = await Promise.all([
        dataUri('freebie-planner/content-notebook.jpg'),
        dataUri('freebie-planner/status-board.jpg'),
        dataUri('freebie-planner/content-bank.jpg'),
      ]);
      return shell(
        `${BYLINE_CSS}
    .strips{display:flex;gap:24px;padding:48px 60px 0}
    .strips img{width:211px;height:460px;object-fit:cover;border-radius:24px;display:block}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="strips">${shots.map((s) => `<img src="${s}">`).join('')}</div>
  ${byline()}`,
      );
    },
  ],

  /* 24 — the site's vertical rhythm as abstract stripes; heading on the paper. */
  [
    'band-stack.png',
    () =>
      shell(
        `
    .stack{position:absolute;left:0;right:0;bottom:0}
    .s{height:100px}
    .snow{background:#fafafa}
    .blush{background:#f7f2ef}
    .mist{background:#e8e6e6}
    .foot{height:117px;background:#333;display:flex;align-items:center;justify-content:center}
    .foot span{color:#fcfcfa}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="stack">
    <div class="s snow"></div>
    <div class="s blush"></div>
    <div class="s lavender"></div>
    <div class="s mist"></div>
    <div class="foot"><span class="caps">${WORDMARK}</span></div>
  </div>`,
      ),
  ],

  /* 25 — a quote mark on lavender, nothing else in the way. */
  [
    'quote-lavender.png',
    () =>
      shell(
        `${BYLINE_CSS}
    body{background:#e8e5fc}
    .quote{font-family:Playfair;font-style:italic;font-size:60px;line-height:1.1;color:#000;
      text-align:center;margin-top:110px}
  `,
        `
  <div class="quote">&ldquo;</div>
  ${byline('ink')}`,
      ),
  ],

  /* 26 — the portrait in a big circle, ticker above, heading below. */
  [
    'portrait-circle.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    .disc{display:block;margin:72px auto 0;width:400px;height:400px;border-radius:9999px;
      object-fit:cover;object-position:center 12%;box-shadow:6.5px 11.3px 19px 0 #0000001c}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <img class="disc" src="${await dataUri('gabi-portrait.jpg')}">
  ${byline()}`,
      ),
  ],

  /* 27 — the freebie mockup poster floated on blush, heading above. */
  [
    'mockups-blush.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    body{background:#f7f2ef}
    .shot{position:absolute;left:50%;bottom:${BAND_H + 56}px;transform:translateX(-50%);
      width:640px;height:496px;object-fit:cover;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .eyebrow{position:absolute;left:0;right:0;top:140px;text-align:center}
    .eyebrow span{background:#e8e5fc;padding:6px 14px}
  `,
        `
  <div class="eyebrow"><span class="caps">${EYEBROW_FREEBIE}</span></div>
  <img class="shot" src="${await dataUri('content-planner-freebie/planner-mockups.jpg')}">
  ${byline()}`,
      ),
  ],

  /* 28 — the devices mockup on mist, heading above. */
  [
    'devices-mist.png',
    async () =>
      shell(
        `${BYLINE_CSS}
    body{background:#e8e6e6}
    .shot{position:absolute;left:50%;bottom:${BAND_H + 72}px;transform:translateX(-50%);
      width:680px;height:389px;object-fit:contain}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <img class="shot" src="${await dataUri('ig/devices.png')}">
  ${byline()}`,
      ),
  ],

  /* 29 — the wordmark as a masthead, magazine-cover style. */
  [
    'masthead.png',
    () =>
      shell(
        `${BYLINE_CSS}
    .mast{font-family:Playfair;font-size:52px;line-height:1.1;color:#000;text-align:center;
      margin-top:130px}
    .rule{width:140px;border-top:1px solid #d7d7d7;margin:36px auto 0}
  `,
        `
  <div class="mast">templatesbygabi</div>
  <div class="rule"></div>
  ${byline()}`,
      ),
  ],

  /* 30 — slivers of the hero photograph top and bottom, paper field between. */
  [
    'film-slivers.png',
    async () => {
      const src = await dataUri('hero.jpg');
      return shell(
        `
    .sliver{width:100%;height:120px;object-fit:cover;display:block}
    .top{object-position:center 15%}
    .bot{object-position:center 85%}
    .byline{position:absolute;left:0;right:0;bottom:120px}
  `,
        `
  <img class="sliver top" src="${src}">
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>
  <img class="sliver bot" src="${src}" style="position:absolute;left:0;bottom:0">`,
      );
    },
  ],
];

/* ------------------------------------------------------------------------ render */

const browser = await chromium.launch();
for (const [file, build] of COVERS) {
  const page = await browser.newPage({ viewport: PIN, deviceScaleFactor: SCALE });
  await page.setContent(await build(), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(OUT_DIR, file);
  await page.screenshot({ path: out, type: 'png' });
  await page.close();
  const { size } = await fs.stat(out);
  console.log(
    `  ${file.padEnd(28)} ${PIN.width * SCALE}x${PIN.height * SCALE}   ${(size / 1024).toFixed(0)} kB`,
  );
}
await browser.close();
