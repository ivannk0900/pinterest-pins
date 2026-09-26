#!/usr/bin/env node
/**
 * build-covers.mjs — twenty Pinterest pin cover TEMPLATES in templatesbygabi.com's
 * landing-page design language, 800x1200 (the batch-standard size).
 *
 * These are covers, not finished pins: every one leaves a deliberate empty zone where a
 * heading gets typed on afterwards (Canva / Pinterest editor), and none of them carries a
 * button or any other interactive-looking chrome — a pill that says "shop now" on a static
 * image is a lie, so nothing here pretends to be clickable. What they do carry is the
 * site's own furniture: marquee tickers, byline bars, eyebrows, the review card, the
 * planner collage, the one shadow, the two brand faces.
 *
 * Image-making is normally out of scope for this repo (see CLAUDE.md) — this folder is
 * here by explicit request, and it stays self-contained: it reads the fonts and the
 * photography out of the salespage repo by absolute path and resolves Playwright from
 * that repo's node_modules.
 *
 *     node "landing-page-covers/build-covers.mjs"
 *
 * Tokens only, per the salespage CLAUDE.md: paper #fcfcfa · white #ffffff · blush #f7f2ef ·
 * lavender #e8e5fc · ink #333333 · black #000000 · mist #e8e6e6 · rule #d7d7d7 ·
 * ink/20 #33333333 · white/40 #ffffff66 · radius 24/50px ·
 * shadow 6.5px 11.3px 19px 0 #0000001c · Playfair Display + Questrial.
 * Copy is the landing page's own — eyebrows, marquees, the wordmark, nothing invented.
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
const BAND_H = 83; // ticker/byline band height, same as every existing pin

/**
 * Laid out on the 800x1200 grid every existing pin uses, screenshotted at 1.25x so the
 * file is 1000x1500 — Pinterest's recommended minimum is 1000px wide, and the extra
 * resolution is headroom for the heading that gets typed on afterwards.
 */
const SCALE = 1.25;

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
  /* Tickers start flush left like the compositor's, so the first repeat is whole;
     .center is for the byline wordmark. */
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
`;

const ticker = (text) => Array.from({ length: 20 }, () => text).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

const shell = async (css, body) =>
  `<!doctype html><meta charset="utf-8"><style>${await faces()}${BASE}${css}</style>${body}`;

/* Real site copy, and nothing else. */
const T_FIRST_CLASS = 'First class templates for first-class business owners';
const T_CLIENT_LOVE = 'Client love';
const T_ON_THE_BLOG = 'On the blog';
const WORDMARK = 'templatesbygabi.com';
const EYEBROW_HERO = 'Time-saving products for busy service providers';
const EYEBROW_FREEBIE = "Now let's get you a freebie!";
const EYEBROW_ABOUT = 'Your small business and marketing sidekick';

const byline = (cls = 'lavender') =>
  `<div class="band ${cls} center"><span>${WORDMARK}</span></div>`;

/* --------------------------------------------------- archetype: full-photo stage */
/**
 * Ticker, photograph filling the middle, byline. Eyebrow near the top of the photo;
 * the rest of the photo is the heading zone.
 */
async function fullPhoto({ photo, pos = 'center', eyebrowColor = '#fcfcfa', eyebrow }) {
  const src = await dataUri(photo);
  return shell(
    `
    .stage{position:relative;height:${PIN.height - 2 * BAND_H}px}
    .stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
      object-position:${pos}}
    .overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
      padding:76px 60px;text-align:center}
    .overlay .caps{color:${eyebrowColor}}
  `,
    `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="stage">
    <img src="${src}">
    <div class="overlay">${eyebrow ? `<div class="caps">${eyebrow}</div>` : ''}</div>
  </div>
  ${byline()}`,
  );
}

/* ---------------------------------------------- archetype: five-band pin skeleton */
/**
 * The blog-pin poster with its headline band left empty — the same geometry
 * build-pin.mjs composes (83 / 464 / 484 / 83 / 86), so a heading typed into the blush
 * band lands exactly where the compositor would have set it.
 */
async function fiveBand({ photo, tickerText, pos = 'center 35%' }) {
  const src = await dataUri(photo);
  return shell(
    `
    .photo{height:464px;width:100%;object-fit:cover;object-position:${pos};display:block}
    .headline{height:484px;background:#f7f2ef}
    .sliver{height:86px;width:100%;object-fit:cover;object-position:center 80%;display:block}
  `,
    `
  <div class="band lavender"><span>${ticker(tickerText)}</span></div>
  <img class="photo" src="${src}">
  <div class="headline"></div>
  ${byline()}
  <img class="sliver" src="${src}">`,
  );
}

/* ------------------------------------------------------------------- the twenty */

const COVERS = [
  /* 1 — the hero: dark photograph, its own eyebrow, the void is the heading zone. */
  [
    'hero-dark.png',
    () => fullPhoto({ photo: 'hero.jpg', eyebrow: EYEBROW_HERO }),
  ],

  /* 2 — the juicy-question books photograph (already exactly 2:3) under a white/40
     wash panel, the site's own over-imagery treatment. Heading goes in the panel. */
  [
    'books-wash-panel.png',
    async () =>
      shell(
        `
    body>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .wash{position:absolute;left:70px;right:70px;top:330px;height:460px;
      background:#ffffff66;border-radius:24px}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <img src="${await dataUri('juicy-question.jpg')}">
  <div class="wash"></div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 3 — silk texture, ink eyebrow, all quiet: a light background for a dark heading. */
  [
    'silk-light.png',
    () =>
      fullPhoto({
        photo: 'ig/silk.jpg',
        eyebrowColor: '#333',
        eyebrow: EYEBROW_HERO,
      }),
  ],

  /* 4 — the about section folded vertical: portrait on top, blush heading zone under
     it with the about eyebrow. */
  [
    'gabi-portrait-blush.png',
    async () =>
      shell(
        `
    .portrait{height:640px;width:100%;object-fit:cover;object-position:center 18%;display:block}
    .zone{height:${PIN.height - 640 - BAND_H}px;background:#f7f2ef;display:flex;
      flex-direction:column;align-items:center;padding:56px 60px;text-align:center}
    .eyebrow{background:#e8e5fc;padding:6px 14px}
  `,
        `
  <img class="portrait" src="${await dataUri('gabi-portrait.jpg')}">
  <div class="zone"><span class="caps eyebrow">${EYEBROW_ABOUT}</span></div>
  ${byline()}`,
      ),
  ],

  /* 5 — the client-love band: ink tickers, dark photograph, the white review card.
     Quote mark and attribution set; the quotation is the heading zone. The attribution
     reads "Review from customer" — never the marketplace's name (owner's rule). */
  [
    'client-love-card.png',
    async () =>
      shell(
        `
    .stage{position:relative;height:${PIN.height - 2 * BAND_H}px}
    .stage>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
      object-position:center 40%}
    .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:620px;height:780px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c;display:flex;flex-direction:column;
      align-items:center;padding:64px 56px 56px;text-align:center}
    .quote{font-family:Playfair;font-style:italic;font-size:60px;line-height:1.1;color:#000}
    .rule{width:140px;border-top:1px solid #d7d7d7;margin:28px 0}
  `,
        `
  <div class="band ink"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  <div class="stage">
    <img src="${await dataUri('testimonial-bg.jpg')}">
    <div class="card">
      <div class="quote">&ldquo;</div>
      <div style="flex:1"></div>
      <div class="rule"></div>
      <div class="caps">Review from customer</div>
    </div>
  </div>
  <div class="band ink"><span>${ticker(T_CLIENT_LOVE)}</span></div>`,
      ),
  ],

  /* 6-9 — the five-band pin skeleton over four different photographs. The empty blush
     band takes the heading exactly where the blog compositor would set it. */
  ['on-the-blog-couch.png', () => fiveBand({ photo: 'ig/couch-laptop.jpg', tickerText: T_ON_THE_BLOG })],
  ['on-the-blog-steps.png', () => fiveBand({ photo: 'ig/steps-laptop.jpg', tickerText: T_ON_THE_BLOG })],
  ['five-band-portrait.png', () => fiveBand({ photo: 'gabi-portrait.jpg', tickerText: T_FIRST_CLASS, pos: 'center 18%' })],
  [
    'five-band-mockups.png',
    () => fiveBand({ photo: 'content-planner-freebie/planner-mockups.jpg', tickerText: T_FIRST_CLASS, pos: 'center' }),
  ],

  /* 10 — the freebie band: tilted planner views, FREE badge, highlighted eyebrow.
     The blush gap under the eyebrow is the heading zone. */
  [
    'freebie-collage.png',
    async () => {
      const [notebook, board, badge] = await Promise.all([
        dataUri('freebie-planner/content-notebook.jpg'),
        dataUri('freebie-planner/status-board.jpg'),
        dataUri('free-badge.png'),
      ]);
      return shell(
        `
    body{background:#f7f2ef}
    .collage{position:relative;height:640px}
    .shot{position:absolute;border-radius:24px;overflow:hidden;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .shot img{display:block;width:100%;height:100%;object-fit:cover}
    .back{width:520px;height:347px;right:36px;top:96px;transform:rotate(4deg)}
    .front{width:560px;height:373px;left:40px;top:236px;transform:rotate(-4deg)}
    .badge{position:absolute;width:150px;height:150px;right:52px;top:40px;transform:rotate(8deg)}
    .content{position:absolute;left:0;right:0;top:640px;bottom:${BAND_H}px;display:flex;
      flex-direction:column;align-items:center;padding:36px 60px;text-align:center}
    .eyebrow{background:#e8e5fc;padding:6px 14px}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="collage">
    <div class="shot back"><img src="${board}"></div>
    <div class="shot front"><img src="${notebook}"></div>
    <img class="badge" src="${badge}">
  </div>
  <div class="content"><span class="caps eyebrow">${EYEBROW_FREEBIE}</span></div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      );
    },
  ],

  /* 11 — the same collage upside down: heading zone on top of mist, planner views
     anchored at the bottom. */
  [
    'planner-collage-mist.png',
    async () => {
      const [bank, board] = await Promise.all([
        dataUri('freebie-planner/content-bank.jpg'),
        dataUri('freebie-planner/status-board.jpg'),
      ]);
      return shell(
        `
    body{background:#e8e6e6}
    .zone{height:520px;display:flex;flex-direction:column;align-items:center;
      padding:64px 60px;text-align:center}
    .eyebrow{background:#e8e5fc;padding:6px 14px}
    .collage{position:relative;height:${PIN.height - 520 - BAND_H}px}
    .shot{position:absolute;border-radius:24px;overflow:hidden;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .shot img{display:block;width:100%;height:100%;object-fit:cover}
    .back{width:520px;height:347px;left:36px;top:24px;transform:rotate(-4deg)}
    .front{width:560px;height:373px;right:40px;top:170px;transform:rotate(3deg)}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="zone"><span class="caps eyebrow">${EYEBROW_FREEBIE}</span></div>
  <div class="collage">
    <div class="shot back"><img src="${board}"></div>
    <div class="shot front"><img src="${bank}"></div>
  </div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      );
    },
  ],

  /* 12 — the product grid, 2x2 like the home section; heading zone below it. */
  [
    'product-grid.png',
    async () => {
      const shots = await Promise.all(
        [
          'product-social-marketing.jpg',
          'product-business-planner.jpg',
          'product-client-portal.jpg',
          'product-life-planner.jpg',
        ].map(dataUri),
      );
      return shell(
        `
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:48px 60px 0}
    .grid img{width:100%;height:300px;object-fit:cover;border-radius:24px;display:block}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="grid">${shots.map((s) => `<img src="${s}">`).join('')}</div>
  <div style="position:absolute;left:0;right:0;bottom:0">${byline()}</div>`,
      );
    },
  ],

  /* 13 — one product shot on lavender, heading zone under the card. */
  [
    'product-lavender.png',
    async () =>
      shell(
        `
    body{background:#e8e5fc}
    .shot{display:block;margin:64px auto 0;width:560px;height:640px;object-fit:cover;
      object-position:center top;border-radius:24px;box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <img class="shot" src="${await dataUri('product-social-marketing.jpg')}">
  <div class="band ink center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 14 — heading zone on blush over two tilted product shots. */
  [
    'product-duo-blush.png',
    async () => {
      const [a, b] = await Promise.all([
        dataUri('product-business-planner.jpg'),
        dataUri('product-client-portal.jpg'),
      ]);
      return shell(
        `
    body{background:#f7f2ef}
    .collage{position:absolute;left:0;right:0;top:560px;bottom:${BAND_H}px}
    .shot{position:absolute;border-radius:24px;overflow:hidden;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .shot img{display:block;width:100%;height:100%;object-fit:cover}
    .a{width:340px;height:425px;left:56px;top:48px;transform:rotate(-3deg)}
    .b{width:340px;height:425px;right:56px;top:110px;transform:rotate(3deg)}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="collage">
    <div class="shot a"><img src="${a}"></div>
    <div class="shot b"><img src="${b}"></div>
  </div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      );
    },
  ],

  /* 15 — the about section's wordmark pattern as a backdrop, white card as the
     heading zone. Pattern is ink/20 so anything typed over the card carries. */
  [
    'wordmark-pattern.png',
    async () => {
      const rows = Array.from(
        { length: 24 },
        (_, i) =>
          `<div style="margin-left:${i % 2 ? -120 : -30}px">${Array.from(
            { length: 6 },
            () => 'templatesbygabi',
          ).join('&nbsp;&nbsp;')}</div>`,
      ).join('');
      return shell(
        `
    .pattern{position:absolute;inset:0;overflow:hidden;padding-top:12px}
    .pattern div{font-family:Playfair;font-size:29px;line-height:1.7;letter-spacing:.1em;
      text-transform:uppercase;color:#33333333;white-space:nowrap}
    .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:560px;height:680px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="pattern">${rows}</div>
  <div class="card"></div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      );
    },
  ],

  /* 16 — the client-love band without the card: an ink pin for a paper heading. */
  [
    'client-love-ink.png',
    () =>
      shell(
        `
    body{background:#333}
    .quote{font-family:Playfair;font-style:italic;font-size:60px;line-height:1.1;
      color:#fcfcfa;text-align:center;margin-top:72px}
    .foot{position:absolute;left:0;right:0;bottom:${BAND_H + 48}px;display:flex;
      flex-direction:column;align-items:center;gap:24px}
    .foot .rule{width:140px;border-top:1px solid #d7d7d7}
    .foot .caps{color:#fcfcfa}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band ink"><span>${ticker(T_CLIENT_LOVE)}</span></div>
  <div class="quote">&ldquo;</div>
  <div class="foot"><div class="rule"></div><div class="caps">Review from customer</div></div>
  <div class="band ink byline"><span>${ticker(T_CLIENT_LOVE)}</span></div>`,
      ),
  ],

  /* 17 — lavender field, white card: the boldest, plainest heading holder. */
  [
    'lavender-card.png',
    () =>
      shell(
        `
    body{background:#e8e5fc}
    .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:600px;height:840px;background:#fff;border-radius:24px;
      box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band ink"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="card"></div>
  <div class="band ink center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 18 — the juicy-question photograph in a rounded card on blush, the way the site
     frames imagery inside SplitSection; heading zone below the card. */
  [
    'books-card-blush.png',
    async () =>
      shell(
        `
    body{background:#f7f2ef}
    .shot{display:block;margin:44px auto 0;width:600px;height:600px;object-fit:cover;
      object-position:center 60%;border-radius:24px;box-shadow:6.5px 11.3px 19px 0 #0000001c}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <img class="shot" src="${await dataUri('juicy-question.jpg')}">
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 19 — paper, hairlines and an eyebrow: the quietest template. */
  [
    'paper-minimal.png',
    () =>
      shell(
        `
    .inner{position:absolute;left:60px;right:60px;top:${BAND_H + 64}px;bottom:${BAND_H + 64}px;
      border-top:1px solid #d7d7d7;border-bottom:1px solid #d7d7d7;display:flex;
      flex-direction:column;align-items:center;padding:48px 0;text-align:center}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="band lavender"><span>${ticker(T_FIRST_CLASS)}</span></div>
  <div class="inner"><span class="caps">${EYEBROW_ABOUT}</span></div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      ),
  ],

  /* 20 — the /links header: avatar, Playfair wordmark, open space below. */
  [
    'avatar-links.png',
    async () =>
      shell(
        `
    .top{display:flex;flex-direction:column;align-items:center;padding-top:96px}
    .avatar{width:180px;height:180px;border-radius:9999px;object-fit:cover;display:block}
    .name{font-family:Playfair;font-size:40px;line-height:1.3;color:#000;margin-top:28px}
    .byline{position:absolute;left:0;right:0;bottom:0}
  `,
        `
  <div class="top">
    <img class="avatar" src="${await dataUri('gabi-avatar.png')}">
    <div class="name">templatesbygabi</div>
  </div>
  <div class="band lavender center byline"><span>${WORDMARK}</span></div>`,
      ),
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
