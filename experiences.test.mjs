import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./experiences.html', import.meta.url), 'utf8');
const experiences = JSON.parse(await readFile(new URL('./dist/data/experiences.v1.json', import.meta.url), 'utf8')).data;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes("fetch('data/experiences.v1.json',{cache:'no-cache'})"), 'missing generated experiences feed fetch');

assert(/<div\b[^>]*\bclass=["'][^"']*\bexperience-grid\b[^"']*["'][^>]*\bid=["']experience-grid["'][^>]*>/i.test(html), 'missing experience card container');
assert(/<div\b[^>]*\bid=["']experience-grid["'][^>]*>[\s\S]*?<article class=["']skeleton-card["'] aria-hidden=["']true["']><\/article>[\s\S]*?<\/div>[\s\S]*?fetch\(['"]data\/experiences\.v1\.json['"],\{cache:['"]no-cache['"]\}\)/i.test(html), 'loading skeleton markup is missing before generated experiences data loads');
assert(html.includes("document.getElementById('experience-grid')"), 'experience card container is not referenced in JavaScript');
assert(html.includes("document.createElement('article')"), 'experience card article markup is missing');
assert(html.includes("card.className='experience-card'"), 'rendered article is missing the experience-card class');
assert(html.includes('experiences.forEach(renderCard)'), 'experience entries are not rendered as cards');
assert(html.includes('No experiences listed right now — check back soon.'), 'missing experiences empty-state message');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?image\.alt\s*=\s*experience\.name/.test(html), 'rendered experience images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(experiences.length > 0, 'generated experiences feed has no entries');
const BOOKABLE_IDS = ['coffee-with-the-cows', 'alpaca-experience-walk', 'private-guided-farm-tour', 'virtual-farm-tour', 'birthday-party'];
assert(experiences.length === 6, 'seasonal placeholder should be removed from the experience feed');
assert(!experiences.some((experience) => experience.id === 'seasonal-events'), 'seasonal-events record is still present');
for (const experience of experiences) {
  const expectedPath = BOOKABLE_IDS.includes(experience.id) ? `book/${experience.id}` : null;
  assert(experience.bookPath === expectedPath, `${experience.id} has an unexpected first-party booking path`);
}
assert(!/groom/i.test(JSON.stringify(experiences)), 'generated experiences feed still contains a "groom" claim');
assert(html.includes("if(experience.bookPath&&experience.bookPath.indexOf('book/')===0)"), 'missing first-party booking branch');
assert(html.includes("book.href=experience.bookPath"), 'booking CTA does not use the generated first-party path');
assert(html.includes("'Choose a date'"), 'missing first-party booking CTA');
assert(html.includes("'Contact the farm'"), 'missing inquiry-only contact CTA');
assert(html.includes("contact.href='mailto:tapestryacres@gmail.com?subject='"), 'inquiry-only CTA does not use the farm contact');
assert(!/seasonal-events|Seasonal & One-Time Events/.test(html), 'seasonal placeholder remains in the page');

const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert(scripts.length > 0, 'missing inline JavaScript');
for (const script of scripts) {
  new Function(script);
}

console.log('PASS: generated experience paths, first-party booking CTAs, card rendering, and JavaScript checks');
