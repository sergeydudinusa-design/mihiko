#!/usr/bin/env node
/**
 * Mihiko CMS Build Script
 * Читает JSON из content/ → генерирует public/index.html
 * Запускается автоматически при каждом сохранении в Decap CMS
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ──────────────────────────────────────────────────────────
function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJSON(path.join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => (a.sort || 999) - (b.sort || 999));
}

// ── Load content ──────────────────────────────────────────────────────
const S   = readJSON('content/settings.json') || {};
const seo = S.seo || {};
const brand = S.brand || {};
const contacts = S.contacts || {};
const hero = S.hero || {};
const dl = S.download || {};
const footer = S.footer || {};
const marquee = S.marquee || [];

const MENU      = readDir('content/menu').filter(m => m.available !== false);
const SETS      = readDir('content/sets');
const LOCATIONS = readDir('content/locations');
const FAQ       = readDir('content/faq');

const accent = brand.accent || '#E63946';

// ── Template helpers ──────────────────────────────────────────────────
function menuCard(m) {
  return `
  <article class="mi-menu-card reveal" itemscope itemtype="https://schema.org/MenuItem">
    <div class="mi-card-img" role="img" aria-label="${esc(m.name)}">${m.emoji || '🍣'}</div>
    <div class="mi-card-body">
      ${m.tag ? `<span class="mi-card-tag">${esc(m.tag)}</span>` : ''}
      <h3 class="mi-card-name" itemprop="name">${esc(m.name)}</h3>
      <p class="mi-card-sub" itemprop="description">${esc(m.sub)}</p>
      <div class="mi-card-footer">
        <div>
          <div class="mi-card-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price">${m.price}</span>
            <meta itemprop="priceCurrency" content="RUB"> ₽
          </div>
          <div class="mi-card-weight">${esc(m.weight)}</div>
        </div>
        <button class="mi-card-add" aria-label="Добавить ${esc(m.name)} в корзину">+</button>
      </div>
    </div>
  </article>`;
}

function setCard(s) {
  const save = s.old_price - s.price;
  return `
  <article class="mi-set-card${s.featured ? ' featured' : ''} reveal" itemscope itemtype="https://schema.org/Product">
    ${s.featured ? '<div class="mi-set-badge">⭐ Популярный</div>' : ''}
    <h3 class="mi-set-name" itemprop="name">${esc(s.name)}</h3>
    <p class="mi-set-desc">${esc(s.desc)}</p>
    <ul class="mi-set-rolls" aria-label="Состав сета">
      ${(s.rolls || []).map(r => `<li class="mi-set-roll">${esc(r)}</li>`).join('')}
    </ul>
    <div class="mi-set-footer">
      <div class="mi-set-price-wrap" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
        <div class="mi-set-price"><span itemprop="price">${s.price.toLocaleString('ru')}</span> <meta itemprop="priceCurrency" content="RUB">₽</div>
        <div class="mi-set-old">${s.old_price.toLocaleString('ru')} ₽</div>
        <div class="mi-set-save">Экономия ${save} ₽</div>
      </div>
      <a href="#download" class="mi-set-btn">Заказать</a>
    </div>
  </article>`;
}

function locationCard(l) {
  return `
  <address class="mi-location reveal" style="font-style:normal"
           itemscope itemtype="https://schema.org/LocalBusiness">
    <div class="mi-location-city" itemprop="addressLocality">${esc(l.city)}</div>
    <div class="mi-location-addr" itemprop="streetAddress">${esc(l.addr)}</div>
    <div class="mi-location-meta">
      <span>🕐 <span itemprop="openingHours">${esc(l.hours)}</span></span>
      <a href="tel:${(l.phone||'').replace(/\D/g,'')}" itemprop="telephone">${esc(l.phone)}</a>
    </div>
  </address>`;
}

function faqItem(f) {
  return `
  <div class="mi-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <button class="mi-faq-q" aria-expanded="false" onclick="toggleFAQ(this)">
      <span itemprop="name">${esc(f.question)}</span>
      <span class="mi-faq-icon" aria-hidden="true">+</span>
    </button>
    <div class="mi-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <span itemprop="text">${esc(f.answer)}</span>
    </div>
  </div>`;
}

function marqueeHTML() {
  const items = [...marquee, ...marquee, ...marquee, ...marquee];
  return items.map(i => `<span class="mi-marquee-item">${esc(i)}</span>`).join('');
}

function heroStats() {
  const stats = hero.stats || [];
  return stats.map((s, i) => `
    ${i > 0 ? '<div class="mi-stat-div" aria-hidden="true"></div>' : ''}
    <div class="mi-stat"><strong>${esc(s.value)}</strong><small>${esc(s.label)}</small></div>
  `).join('');
}

function catsJS() {
  const cats = ['Все', 'Хит', ...new Set(MENU.map(m => m.cat))];
  return JSON.stringify([...new Set(cats)]);
}

function menuJS() {
  return JSON.stringify(MENU);
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Schema.org JSON-LD ────────────────────────────────────────────────
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Restaurant",
      "@id": `${seo.canonical || 'https://mihiko.ru/'}#organization`,
      "name": brand.brand_name || "Михико",
      "description": seo.description || "",
      "url": seo.canonical || "https://mihiko.ru/",
      "telephone": contacts.phone || "",
      "email": contacts.email || "",
      "servesCuisine": ["Японская кухня", "Суши", "Роллы"],
      "openingHours": "Mo-Su 11:00-23:00",
      "priceRange": "₽₽",
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "12000", "bestRating": "5" }
    },
    {
      "@type": "MobileApplication",
      "name": brand.brand_name || "Михико",
      "operatingSystem": "iOS, Android",
      "applicationCategory": "FoodDelivery",
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "12000" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "RUB", "description": "Скидка 15% на первый заказ" }
    },
    {
      "@type": "FAQPage",
      "mainEntity": FAQ.map(f => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer }
      }))
    }
  ]
};

// ── HTML Template ─────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${esc(seo.title)}</title>
  <meta name="description" content="${esc(seo.description)}">
  <meta name="robots" content="index, follow">
  <meta name="author" content="${esc(brand.brand_name || 'Михико')}">
  <link rel="canonical" href="${esc(seo.canonical || 'https://mihiko.ru/')}">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(seo.canonical || 'https://mihiko.ru/')}">
  <meta property="og:title" content="${esc(seo.og_title)}">
  <meta property="og:description" content="${esc(seo.og_description)}">
  <meta property="og:image" content="${esc((seo.canonical||'https://mihiko.ru/').replace(/\/?$/,'')+'/og-image.jpg')}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="${esc(brand.brand_name || 'Михико')}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seo.og_title)}">
  <meta name="twitter:description" content="${esc(seo.og_description)}">

  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

  <style>
    :root {
      --accent: ${accent};
      --bg: #14161a; --bg-2: #1a1d22; --bg-3: #20242b;
      --line: rgba(255,255,255,.08); --line-2: rgba(255,255,255,.14);
      --fg: #f4f3ef; --fg-2: #c8c8c0; --fg-3: #8b8b85;
      --font-display: 'Cormorant Garamond', 'Times New Roman', serif;
      --font-body: 'Inter', system-ui, sans-serif;
      --pad: clamp(24px, 5vw, 80px); --radius: 18px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--fg); font-family: var(--font-body); font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; border: none; background: none; color: inherit; padding: 0; cursor: pointer; }
    img { display: block; max-width: 100%; }

    /* NAV */
    .mi-nav { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; width: min(1320px, calc(100vw - 32px)); display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 12px 20px; border-radius: 999px; background: rgba(20,22,26,.55); backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%); border: 1px solid var(--line); transition: background .3s; }
    .mi-nav.is-scrolled { background: rgba(20,22,26,.88); }
    .mi-logo { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
    .mi-logo-mark { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; background: var(--accent); font-family: var(--font-body); font-size: 14px; font-weight: 600; }
    .mi-logo-text { font-style: italic; }
    .mi-nav-links { display: flex; gap: 4px; list-style: none; }
    .mi-nav-links a { display: block; padding: 8px 14px; border-radius: 999px; font-size: 14px; color: var(--fg-2); transition: color .2s, background .2s; }
    .mi-nav-links a:hover { color: var(--fg); background: rgba(255,255,255,.05); }
    .mi-nav-cta { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; background: var(--fg); color: var(--bg); font-size: 13px; font-weight: 600; transition: transform .2s; }
    .mi-nav-cta:hover { transform: translateY(-1px); }
    @media (max-width: 800px) { .mi-nav-links { display: none; } }

    /* HERO */
    .mi-hero { position: relative; padding: 130px var(--pad) 60px; overflow: hidden; }
    .mi-hero::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 1100px; height: 700px; background: radial-gradient(ellipse, color-mix(in oklab, var(--accent) 30%, transparent) 0%, transparent 60%); filter: blur(60px); pointer-events: none; z-index: 0; }
    .mi-hero-grid { position: relative; z-index: 1; max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 1fr; gap: 80px; align-items: center; min-height: calc(100vh - 240px); }
    @media (max-width: 1000px) { .mi-hero-grid { grid-template-columns: 1fr; gap: 60px; min-height: auto; } }
    .mi-hero-badge { display: inline-flex; align-items: center; gap: 10px; padding: 7px 14px 7px 12px; border-radius: 999px; background: rgba(255,255,255,.05); border: 1px solid var(--line); font-size: 13px; color: var(--fg-2); }
    .mi-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.6} }
    .mi-hero-title { font-family: var(--font-display); font-size: clamp(48px, 7.5vw, 112px); line-height: .95; letter-spacing: -.03em; font-weight: 400; margin: 24px 0 0; }
    .mi-hero-title em { font-style: italic; color: var(--accent); }
    .mi-hero-sub { margin: 28px 0 0; max-width: 480px; font-size: 18px; line-height: 1.6; color: var(--fg-2); }
    .mi-hero-cta { display: flex; gap: 12px; margin-top: 36px; flex-wrap: wrap; }
    .mi-btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 22px; border-radius: 999px; font-size: 15px; font-weight: 600; transition: transform .2s, box-shadow .2s; }
    .mi-btn:hover { transform: translateY(-2px); }
    .mi-btn-primary { background: var(--accent); color: #fff; box-shadow: 0 14px 40px -12px rgba(230,57,70,.5); }
    .mi-btn-primary:hover { box-shadow: 0 20px 50px -10px rgba(230,57,70,.7); }
    .mi-btn-ghost { background: rgba(255,255,255,.06); border: 1px solid var(--line-2); color: var(--fg); }
    .mi-btn-dark { background: #000; border: 1px solid var(--line); color: var(--fg); }
    .mi-btn div { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1; }
    .mi-btn small { font-size: 10px; font-weight: 500; opacity: .8; letter-spacing: .04em; text-transform: uppercase; }
    .mi-btn strong { font-size: 15px; font-weight: 600; }
    .mi-hero-stats { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-top: 56px; padding-top: 32px; border-top: 1px solid var(--line); }
    .mi-stat { display: flex; flex-direction: column; gap: 4px; }
    .mi-stat strong { font-family: var(--font-display); font-size: 28px; font-weight: 500; letter-spacing: -.02em; }
    .mi-stat small { font-size: 12px; color: var(--fg-3); max-width: 180px; line-height: 1.4; }
    .mi-stat-div { width: 1px; height: 36px; background: var(--line); }

    /* Phone mockup */
    .mi-hero-visual { position: relative; display: flex; justify-content: center; align-items: center; min-height: 560px; }
    .mi-hero-glow { position: absolute; inset: -10%; background: radial-gradient(circle, color-mix(in oklab, var(--accent) 25%, transparent), transparent 65%); filter: blur(40px); pointer-events: none; }
    .mi-phone { position: relative; z-index: 2; width: 260px; height: 530px; background: linear-gradient(160deg, #2a2d35, #1a1c22); border-radius: 40px; border: 1px solid var(--line-2); box-shadow: 0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06); overflow: hidden; display: flex; flex-direction: column; }
    .mi-phone-notch { width: 100px; height: 28px; background: #0e1014; border-radius: 0 0 18px 18px; align-self: center; margin-bottom: 12px; flex-shrink: 0; }
    .mi-phone-screen { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
    .mi-phone-header { font-size: 18px; font-weight: 600; font-family: var(--font-display); font-style: italic; }
    .mi-phone-card { background: rgba(255,255,255,.06); border-radius: 14px; border: 1px solid var(--line); padding: 12px; display: flex; gap: 10px; align-items: center; }
    .mi-phone-card-img { width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), #ff6b74); display: grid; place-items: center; font-size: 22px; flex-shrink: 0; }
    .mi-phone-card-info { flex: 1; min-width: 0; }
    .mi-phone-card-name { font-size: 13px; font-weight: 600; }
    .mi-phone-card-sub { font-size: 11px; color: var(--fg-3); }
    .mi-phone-card-price { font-size: 14px; font-weight: 600; color: var(--accent); white-space: nowrap; }
    .mi-phone-cta { background: var(--accent); color: #fff; border-radius: 12px; padding: 12px; text-align: center; font-weight: 600; font-size: 14px; margin-top: auto; }
    .mi-hero-chip { position: absolute; z-index: 3; background: rgba(20,22,26,.85); backdrop-filter: blur(20px); border: 1px solid var(--line-2); border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
    .mi-chip-1 { top: 12%; right: -20px; }
    .mi-chip-2 { bottom: 20%; left: -20px; flex-direction: column; align-items: flex-start; gap: 2px; }
    .mi-chip-dot { width: 8px; height: 8px; border-radius: 50%; background: #7BAE7F; flex-shrink: 0; }
    .mi-chip-1 > div strong { font-size: 13px; font-weight: 600; display: block; }
    .mi-chip-1 > div small { font-size: 11px; color: var(--fg-3); }
    .mi-chip-2 strong { font-size: 18px; font-weight: 700; color: var(--accent); }
    .mi-chip-2 small { font-size: 11px; color: var(--fg-3); }
    @media (max-width: 1000px) { .mi-chip-1 { right: 0; } .mi-chip-2 { left: 0; } }

    /* MARQUEE */
    .mi-marquee { overflow: hidden; padding: 32px 0; border-top: 1px solid var(--line); margin-top: 60px; white-space: nowrap; }
    .mi-marquee-track { display: inline-flex; animation: marquee 24s linear infinite; }
    .mi-marquee-item { display: inline-flex; align-items: center; gap: 16px; padding: 0 24px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--fg-3); font-weight: 500; }
    .mi-marquee-item::after { content: '·'; color: var(--accent); }
    @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

    /* SECTIONS */
    .mi-section { padding: 100px var(--pad); max-width: 1320px; margin: 0 auto; }
    .mi-section-alt { background: var(--bg-2); max-width: 100%; }
    .mi-section-alt > .mi-section-inner { max-width: 1320px; margin: 0 auto; padding: 100px var(--pad); }
    .mi-section-head { margin-bottom: 60px; }
    .mi-kicker { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: var(--fg-3); font-weight: 500; margin-bottom: 16px; }
    .mi-section-title { font-family: var(--font-display); font-size: clamp(36px, 4.5vw, 64px); line-height: 1.05; letter-spacing: -.02em; font-weight: 400; }
    .mi-section-title em { font-style: italic; color: var(--accent); }
    .mi-section-desc { margin-top: 20px; font-size: 17px; color: var(--fg-2); max-width: 560px; line-height: 1.6; }

    /* MENU */
    .mi-cats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 36px; }
    .mi-cat { padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 500; background: rgba(255,255,255,.05); border: 1px solid var(--line); color: var(--fg-2); transition: all .2s; cursor: pointer; }
    .mi-cat:hover, .mi-cat.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .mi-menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    .mi-menu-card { background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; transition: transform .3s, box-shadow .3s; }
    .mi-menu-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,.3); }
    .mi-card-img { height: 180px; background: linear-gradient(135deg, var(--bg-3), var(--bg-2)); display: grid; place-items: center; font-size: 56px; }
    .mi-card-body { padding: 16px; }
    .mi-card-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: .04em; background: color-mix(in oklab, var(--accent) 20%, transparent); color: var(--accent); margin-bottom: 10px; }
    .mi-card-name { font-size: 16px; font-weight: 600; font-family: var(--font-display); }
    .mi-card-sub { font-size: 13px; color: var(--fg-3); margin-top: 4px; }
    .mi-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
    .mi-card-price { font-size: 17px; font-weight: 700; }
    .mi-card-weight { font-size: 12px; color: var(--fg-3); }
    .mi-card-add { width: 32px; height: 32px; border-radius: 999px; background: var(--accent); color: #fff; display: grid; place-items: center; font-size: 20px; line-height: 1; cursor: pointer; transition: transform .2s; }
    .mi-card-add:hover { transform: scale(1.15); }
    .mi-menu-foot { margin-top: 40px; }
    .mi-link-arrow { display: inline-flex; align-items: center; gap: 8px; color: var(--accent); font-weight: 600; font-size: 15px; transition: gap .2s; }
    .mi-link-arrow:hover { gap: 12px; }

    /* SETS */
    .mi-sets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .mi-set-card { background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)); border: 1px solid var(--line); border-radius: var(--radius); padding: 28px; display: flex; flex-direction: column; gap: 16px; transition: transform .3s, box-shadow .3s; }
    .mi-set-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,.3); }
    .mi-set-card.featured { border-color: color-mix(in oklab, var(--accent) 40%, transparent); background: linear-gradient(160deg, color-mix(in oklab, var(--accent) 12%, transparent), rgba(255,255,255,.02)); }
    .mi-set-badge { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }
    .mi-set-name { font-family: var(--font-display); font-size: 26px; font-weight: 400; font-style: italic; }
    .mi-set-desc { font-size: 13px; color: var(--fg-3); }
    .mi-set-rolls { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .mi-set-roll { font-size: 13px; color: var(--fg-2); display: flex; align-items: center; gap: 8px; }
    .mi-set-roll::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
    .mi-set-footer { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .mi-set-price-wrap { display: flex; flex-direction: column; gap: 2px; }
    .mi-set-price { font-size: 24px; font-weight: 700; }
    .mi-set-old { font-size: 14px; color: var(--fg-3); text-decoration: line-through; }
    .mi-set-save { font-size: 12px; color: #7BAE7F; font-weight: 600; }
    .mi-set-btn { padding: 10px 18px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; transition: transform .2s; white-space: nowrap; }
    .mi-set-btn:hover { transform: translateY(-2px); }

    /* HOW */
    .mi-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 40px; }
    @media (max-width: 700px) { .mi-steps { grid-template-columns: 1fr; } }
    .mi-step-num { font-family: var(--font-display); font-size: 48px; font-weight: 400; color: var(--accent); opacity: .6; margin-bottom: 16px; }
    .mi-step h3 { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
    .mi-step p { font-size: 15px; color: var(--fg-2); line-height: 1.6; }

    /* FEATURES */
    .mi-features { display: grid; grid-template-columns: repeat(2,1fr); gap: 2px; }
    @media (max-width: 600px) { .mi-features { grid-template-columns: 1fr; } }
    .mi-feature { padding: 32px; background: var(--bg-3); transition: background .2s; }
    .mi-feature:hover { background: color-mix(in oklab, var(--accent) 8%, var(--bg-3)); }
    .mi-feature-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--accent); margin-bottom: 12px; font-weight: 600; }
    .mi-feature h3 { font-size: 20px; font-weight: 600; margin-bottom: 10px; font-family: var(--font-display); }
    .mi-feature p { font-size: 14px; color: var(--fg-2); line-height: 1.6; }

    /* LOCATIONS */
    .mi-locations { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .mi-location { padding: 24px; border-radius: var(--radius); background: rgba(255,255,255,.03); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
    .mi-location-city { font-size: 18px; font-weight: 600; font-family: var(--font-display); }
    .mi-location-addr { font-size: 14px; color: var(--fg-2); }
    .mi-location-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--fg-3); margin-top: 4px; }
    .mi-location-meta a { color: var(--fg-2); transition: color .2s; }
    .mi-location-meta a:hover { color: var(--accent); }

    /* FAQ */
    .mi-faq { display: flex; flex-direction: column; gap: 2px; }
    .mi-faq-item { border-radius: 12px; overflow: hidden; }
    .mi-faq-q { width: 100%; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; background: rgba(255,255,255,.03); border: 1px solid var(--line); font-size: 16px; font-weight: 500; text-align: left; cursor: pointer; transition: background .2s; }
    .mi-faq-q:hover { background: rgba(255,255,255,.05); }
    .mi-faq-q.open { background: rgba(255,255,255,.06); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .mi-faq-icon { width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,.08); display: grid; place-items: center; flex-shrink: 0; transition: transform .3s, background .2s; }
    .mi-faq-q.open .mi-faq-icon { transform: rotate(45deg); background: var(--accent); }
    .mi-faq-a { padding: 0 24px; max-height: 0; overflow: hidden; background: rgba(255,255,255,.04); border: 1px solid var(--line); border-top: 0; font-size: 15px; color: var(--fg-2); line-height: 1.7; transition: max-height .3s ease, padding .3s; }
    .mi-faq-a.open { max-height: 200px; padding: 18px 24px; }

    /* DOWNLOAD */
    .mi-download { margin: 0 var(--pad) 80px; border-radius: 32px; background: linear-gradient(135deg, color-mix(in oklab, var(--accent) 25%, var(--bg-2)), var(--bg-2)); border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent); padding: 80px clamp(32px, 6vw, 100px); display: flex; align-items: center; justify-content: space-between; gap: 60px; flex-wrap: wrap; }
    .mi-download-text { max-width: 560px; }
    .mi-download-kicker { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: var(--fg-3); margin-bottom: 16px; }
    .mi-download-title { font-family: var(--font-display); font-size: clamp(36px, 4vw, 60px); line-height: 1.05; font-weight: 400; letter-spacing: -.02em; margin-bottom: 16px; }
    .mi-download-title em { font-style: italic; color: var(--accent); }
    .mi-download-sub { font-size: 17px; color: var(--fg-2); line-height: 1.6; }
    .mi-download-actions { display: flex; flex-direction: column; gap: 20px; }
    .mi-download-btns { display: flex; gap: 12px; flex-wrap: wrap; }
    .mi-qr-wrap { display: flex; align-items: center; gap: 16px; }
    .mi-qr { width: 90px; height: 90px; background: #fff; border-radius: 12px; padding: 8px; display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; }
    .mi-qr-cell { border-radius: 2px; }
    .mi-qr-label strong { font-size: 14px; font-weight: 600; display: block; margin-bottom: 2px; }
    .mi-qr-label small { font-size: 12px; color: var(--fg-3); }

    /* FOOTER */
    .mi-footer { border-top: 1px solid var(--line); padding: 60px var(--pad) 40px; }
    .mi-footer-grid { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
    @media (max-width: 800px) { .mi-footer-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 500px) { .mi-footer-grid { grid-template-columns: 1fr; } }
    .mi-footer-brand { display: flex; flex-direction: column; gap: 16px; }
    .mi-footer-brand p { font-size: 14px; color: var(--fg-3); line-height: 1.6; max-width: 280px; }
    .mi-footer-col { display: flex; flex-direction: column; gap: 10px; }
    .mi-footer-col h5 { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: var(--fg-3); font-weight: 600; margin-bottom: 4px; }
    .mi-footer-col a, .mi-footer-col span { font-size: 14px; color: var(--fg-2); transition: color .2s; }
    .mi-footer-col a:hover { color: var(--fg); }
    .mi-footer-bottom { max-width: 1320px; margin: 40px auto 0; padding-top: 24px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .mi-footer-copy { font-size: 13px; color: var(--fg-3); }

    /* REVEAL */
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); }
    .reveal.is-in { opacity: 1; transform: none; }
  </style>
</head>
<body>

<nav class="mi-nav" id="nav" aria-label="Главная навигация">
  <a href="#top" class="mi-logo" aria-label="${esc(brand.brand_name || 'Михико')} — главная страница">
    <span class="mi-logo-mark" aria-hidden="true">${esc(brand.logo_mark || '三')}</span>
    <span class="mi-logo-text">${esc(brand.brand_name || 'михико')}</span>
  </a>
  <ul class="mi-nav-links" role="list">
    <li><a href="#menu">Меню</a></li>
    <li><a href="#sets">Сеты</a></li>
    <li><a href="#how">Как работает</a></li>
    <li><a href="#locations">Локации</a></li>
    <li><a href="#faq">FAQ</a></li>
  </ul>
  <a href="#download" class="mi-nav-cta">
    Получить −15%
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 6H9M9 6L6 3M9 6L6 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </a>
</nav>

<header id="top" class="mi-hero">
  <div class="mi-hero-grid">
    <div class="mi-hero-text">
      <div class="mi-hero-badge reveal"><span class="mi-pulse" aria-hidden="true"></span>${esc(hero.badge || '')}</div>
      <h1 class="mi-hero-title reveal" style="transition-delay:.1s">
        ${esc(hero.title_1 || 'Свежие роллы')}<br>
        <em>${esc(hero.title_2 || 'в один тап')}</em>
      </h1>
      <p class="mi-hero-sub reveal" style="transition-delay:.2s">${esc(hero.subtitle || '')}</p>
      <div class="mi-hero-cta reveal" style="transition-delay:.28s">
        <a href="${esc(dl.appstore_url || '#')}" class="mi-btn mi-btn-primary" aria-label="Скачать в App Store">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          <div><small>Скачать в</small><strong>App Store</strong></div>
        </a>
        <a href="${esc(dl.googleplay_url || '#')}" class="mi-btn mi-btn-dark" aria-label="Скачать в Google Play">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.6c-.3.3-.5.7-.5 1.3v16.2c0 .6.2 1 .5 1.3l11-11-11-7.8zm12.5 8.7L5.7 21l11.6-6.7-1.2-3zM5.7 3l10.4 9.7 1.2-3L5.7 3zm14.7 7.3l-2.6-1.5-1.5 2.7 1.5 2.7 2.6-1.5c.7-.4.7-1.6 0-2z"/></svg>
          <div><small>Скачать в</small><strong>Google Play</strong></div>
        </a>
      </div>
      <div class="mi-hero-stats reveal" style="transition-delay:.38s">${heroStats()}</div>
    </div>
    <div class="mi-hero-visual" aria-hidden="true">
      <div class="mi-hero-glow"></div>
      <div class="mi-phone">
        <div class="mi-phone-notch"></div>
        <div class="mi-phone-screen">
          <div class="mi-phone-header">${esc(brand.brand_name || 'михико')}</div>
          <div class="mi-phone-card"><div class="mi-phone-card-img">🍣</div><div class="mi-phone-card-info"><div class="mi-phone-card-name">Филадельфия</div><div class="mi-phone-card-sub">лосось · сыр · огурец</div></div><div class="mi-phone-card-price">690 ₽</div></div>
          <div class="mi-phone-card"><div class="mi-phone-card-img">🐉</div><div class="mi-phone-card-info"><div class="mi-phone-card-name">Дракон</div><div class="mi-phone-card-sub">угорь · авокадо · соус</div></div><div class="mi-phone-card-price">780 ₽</div></div>
          <div class="mi-phone-card"><div class="mi-phone-card-img">🌶</div><div class="mi-phone-card-info"><div class="mi-phone-card-name">Спайси тунец</div><div class="mi-phone-card-sub">тунец · спайси · кунжут</div></div><div class="mi-phone-card-price">740 ₽</div></div>
          <div class="mi-phone-cta">Оформить заказ · 2 210 ₽</div>
        </div>
      </div>
      <div class="mi-hero-chip mi-chip-1"><span class="mi-chip-dot"></span><div><strong>Курьер в пути</strong><small>9 мин до вас</small></div></div>
      <div class="mi-hero-chip mi-chip-2"><strong style="color:var(--accent)">+85 ₽</strong><small>кэшбэк за заказ</small></div>
    </div>
  </div>
  <div class="mi-marquee" aria-hidden="true"><div class="mi-marquee-track">${marqueeHTML()}</div></div>
</header>

<section id="menu" class="mi-section" aria-labelledby="menu-title">
  <div class="mi-section-head reveal">
    <div class="mi-kicker">── Меню</div>
    <h2 class="mi-section-title" id="menu-title">Любимые роллы.<br><em>Каждый день свежие.</em></h2>
    <p class="mi-section-desc">Рыба от проверенных поставщиков. Готовим ровно до момента доставки — никогда не лежит.</p>
  </div>
  <div class="mi-cats" id="cats" role="group" aria-label="Фильтр меню"></div>
  <div class="mi-menu-grid" id="menu-grid" aria-live="polite">${MENU.map(menuCard).join('')}</div>
  <div class="mi-menu-foot reveal" style="margin-top:40px">
    <a href="#download" class="mi-link-arrow" style="color:var(--accent)">
      Открыть всё меню в приложении
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>
</section>

<div class="mi-section-alt">
  <section class="mi-section-inner" id="sets" aria-labelledby="sets-title">
    <div class="mi-section-head reveal">
      <div class="mi-kicker">── Сеты</div>
      <h2 class="mi-section-title" id="sets-title">Большие компании,<br><em>выгодные цены.</em></h2>
    </div>
    <div class="mi-sets-grid">${SETS.map(setCard).join('')}</div>
  </section>
</div>

<section id="how" class="mi-section" aria-labelledby="how-title">
  <div class="mi-section-head reveal">
    <div class="mi-kicker">── Как это работает</div>
    <h2 class="mi-section-title" id="how-title">Три шага <em>до ужина.</em></h2>
  </div>
  <div class="mi-steps">
    <div class="mi-step reveal"><div class="mi-step-num">01</div><h3>Скачайте приложение</h3><p>iOS и Android. Регистрация по номеру за 30 секунд.</p></div>
    <div class="mi-step reveal" style="transition-delay:.08s"><div class="mi-step-num">02</div><h3>Выберите блюда</h3><p>120+ позиций, фильтры по составу, аллергенам и остроте.</p></div>
    <div class="mi-step reveal" style="transition-delay:.16s"><div class="mi-step-num">03</div><h3>Получите за 45 минут</h3><p>Отслеживайте курьера на карте. Push на каждом этапе.</p></div>
  </div>
</section>

<div class="mi-section-alt">
  <section class="mi-section-inner" aria-labelledby="features-title">
    <div class="mi-section-head reveal">
      <div class="mi-kicker">── Приложение</div>
      <h2 class="mi-section-title" id="features-title">Всё что нужно,<br><em>в одном приложении.</em></h2>
    </div>
    <div class="mi-features">
      <div class="mi-feature reveal"><div class="mi-feature-kicker">01</div><h3>Скидка 15%</h3><p>На первый заказ в приложении автоматически — без промокодов.</p></div>
      <div class="mi-feature reveal" style="transition-delay:.06s"><div class="mi-feature-kicker">02</div><h3>Кэшбэк бонусами</h3><p>5% возвращаем на счёт. Можно оплатить до 30% следующего заказа.</p></div>
      <div class="mi-feature reveal" style="transition-delay:.12s"><div class="mi-feature-kicker">03</div><h3>Курьер на карте</h3><p>Видно в реальном времени, где едет ваш заказ — до подъезда.</p></div>
      <div class="mi-feature reveal" style="transition-delay:.18s"><div class="mi-feature-kicker">04</div><h3>Любимое — в один клик</h3><p>Сохраняем повторные заказы. Любимый сет — за два касания.</p></div>
    </div>
  </section>
</div>

<section id="locations" class="mi-section" aria-labelledby="locations-title">
  <div class="mi-section-head reveal">
    <div class="mi-kicker">── Локации</div>
    <h2 class="mi-section-title" id="locations-title">6 городов.<br><em>И мы расширяемся.</em></h2>
  </div>
  <div class="mi-locations">${LOCATIONS.map(locationCard).join('')}</div>
</section>

<div class="mi-section-alt">
  <section class="mi-section-inner" id="faq" aria-labelledby="faq-title">
    <div class="mi-section-head reveal">
      <div class="mi-kicker">── FAQ</div>
      <h2 class="mi-section-title" id="faq-title">Частые вопросы.</h2>
    </div>
    <div class="mi-faq" itemscope itemtype="https://schema.org/FAQPage">${FAQ.map(faqItem).join('')}</div>
  </section>
</div>

<div id="download">
  <div class="mi-download reveal">
    <div class="mi-download-text">
      <div class="mi-download-kicker">── Скачать приложение</div>
      <h2 class="mi-download-title">${esc(dl.title_1 || '')}<br><em>${esc(dl.title_2 || '')}</em></h2>
      <p class="mi-download-sub">${esc(dl.subtitle || '')}</p>
    </div>
    <div class="mi-download-actions">
      <div class="mi-download-btns">
        <a href="${esc(dl.appstore_url || '#')}" class="mi-btn mi-btn-primary" aria-label="Скачать в App Store">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          <div><small>Скачать в</small><strong>App Store</strong></div>
        </a>
        <a href="${esc(dl.googleplay_url || '#')}" class="mi-btn mi-btn-dark" aria-label="Скачать в Google Play">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.6c-.3.3-.5.7-.5 1.3v16.2c0 .6.2 1 .5 1.3l11-11-11-7.8zm12.5 8.7L5.7 21l11.6-6.7-1.2-3zM5.7 3l10.4 9.7 1.2-3L5.7 3zm14.7 7.3l-2.6-1.5-1.5 2.7 1.5 2.7 2.6-1.5c.7-.4.7-1.6 0-2z"/></svg>
          <div><small>Скачать в</small><strong>Google Play</strong></div>
        </a>
      </div>
      <div class="mi-qr-wrap">
        <div class="mi-qr" id="qr-visual" aria-label="QR-код"></div>
        <div class="mi-qr-label"><strong>Наведите камеру</strong><small>QR откроет нужный магазин</small></div>
      </div>
    </div>
  </div>
</div>

<footer class="mi-footer" role="contentinfo">
  <div class="mi-footer-grid">
    <div class="mi-footer-brand">
      <a href="#top" class="mi-logo" aria-label="${esc(brand.brand_name || 'Михико')}">
        <span class="mi-logo-mark" aria-hidden="true">${esc(brand.logo_mark || '三')}</span>
        <span class="mi-logo-text">${esc(brand.brand_name || 'михико')}</span>
      </a>
      <p>${esc(footer.description || '')}</p>
    </div>
    <div class="mi-footer-col">
      <h5>Навигация</h5>
      <a href="#menu">Меню</a><a href="#sets">Сеты</a>
      <a href="#how">Как работает</a><a href="#locations">Локации</a><a href="#faq">FAQ</a>
    </div>
    <div class="mi-footer-col">
      <h5>Контакты</h5>
      <a href="tel:${(contacts.phone||'').replace(/\D/g,'')}">${esc(contacts.phone || '')}</a>
      <a href="mailto:${esc(contacts.email || '')}">${esc(contacts.email || '')}</a>
      <span>${esc(contacts.hours || '')}</span>
    </div>
    <div class="mi-footer-col">
      <h5>Соцсети</h5>
      <a href="#">ВКонтакте</a><a href="#">Telegram</a><a href="#">Instagram</a>
    </div>
  </div>
  <div class="mi-footer-bottom">
    <span class="mi-footer-copy">${esc(footer.copyright || '')}</span>
    <div style="display:flex;gap:20px">
      <a href="/privacy" style="font-size:13px;color:var(--fg-3)">Политика конфиденциальности</a>
      <a href="/terms" style="font-size:13px;color:var(--fg-3)">Оферта</a>
    </div>
  </div>
</footer>

<script>
const MENU_DATA = ${menuJS()};
const CATS = ${catsJS()};

// ── Menu filter ──
function buildCats() {
  const wrap = document.getElementById('cats');
  wrap.innerHTML = CATS.map(c => \`<button class="mi-cat\${c==='Все'?' is-active':''}" onclick="filterMenu(this,'\${c}')" aria-pressed="\${c==='Все'}">\${c}</button>\`).join('');
}
function filterMenu(btn, cat) {
  document.querySelectorAll('.mi-cat').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('is-active'); btn.setAttribute('aria-pressed','true');
  const items = cat === 'Все' ? MENU_DATA : cat === 'Хит' ? MENU_DATA.filter(m => m.tag === 'Хит') : MENU_DATA.filter(m => m.cat === cat);
  document.getElementById('menu-grid').innerHTML = items.map(m => \`
    <article class="mi-menu-card reveal is-in" itemscope itemtype="https://schema.org/MenuItem">
      <div class="mi-card-img" role="img" aria-label="\${m.name}">\${m.emoji||'🍣'}</div>
      <div class="mi-card-body">
        \${m.tag ? \`<span class="mi-card-tag">\${m.tag}</span>\` : ''}
        <h3 class="mi-card-name">\${m.name}</h3>
        <p class="mi-card-sub">\${m.sub}</p>
        <div class="mi-card-footer">
          <div><div class="mi-card-price">\${m.price} ₽</div><div class="mi-card-weight">\${m.weight}</div></div>
          <button class="mi-card-add" aria-label="Добавить \${m.name} в корзину">+</button>
        </div>
      </div>
    </article>\`).join('');
}

// ── FAQ ──
function toggleFAQ(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.mi-faq-q.open').forEach(b => { b.classList.remove('open'); b.setAttribute('aria-expanded','false'); b.nextElementSibling.classList.remove('open'); });
  if (!isOpen) { btn.classList.add('open'); btn.setAttribute('aria-expanded','true'); answer.classList.add('open'); }
}

// ── Reveal ──
function observe() {
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.1 });
  document.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
}

// ── Nav scroll ──
window.addEventListener('scroll', () => document.getElementById('nav').classList.toggle('is-scrolled', window.scrollY > 40), { passive: true });

// ── QR ──
function buildQR() {
  const qr = document.getElementById('qr-visual');
  let html = '';
  for (let i = 0; i < 49; i++) {
    const r = Math.floor(i/7), c = i%7;
    const corner = (r<2&&c<2)||(r<2&&c>4)||(r>4&&c<2);
    const filled = corner || (r===0||r===6||c===0||c===6) || Math.random()>.5;
    html += \`<div class="mi-qr-cell" style="background:\${filled?'#14161a':'#fff'}"></div>\`;
  }
  qr.innerHTML = html;
}

buildCats(); buildQR(); observe();
</script>
</body>
</html>`;

// ── Write output ──────────────────────────────────────────────────────
if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html, 'utf8');

// Copy admin files to public/admin
if (!fs.existsSync('public/admin')) fs.mkdirSync('public/admin', { recursive: true });
if (fs.existsSync('admin/index.html')) fs.copyFileSync('admin/index.html', 'public/admin/index.html');
if (fs.existsSync('admin/config.yml')) fs.copyFileSync('admin/config.yml', 'public/admin/config.yml');

// Copy images if any
if (fs.existsSync('public/images')) {
  // already in place
}

const size = fs.statSync('public/index.html').size;
console.log(`✅ Built public/index.html (${(size/1024).toFixed(1)} KB)`);
console.log(`   Menu items: ${MENU.length}`);
console.log(`   Sets: ${SETS.length}`);
console.log(`   Locations: ${LOCATIONS.length}`);
console.log(`   FAQ: ${FAQ.length}`);
