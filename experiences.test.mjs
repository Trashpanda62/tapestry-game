import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./experiences.html', import.meta.url), 'utf8');
const experiences = JSON.parse(await readFile(new URL('./experiences.json', import.meta.url), 'utf8'));

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes("fetch('experiences.json',{cache:'no-cache'})"), 'missing experiences.json fetch');

assert(/<div\b[^>]*\bclass=["'][^"']*\bexperience-grid\b[^"']*["'][^>]*\bid=["']experience-grid["'][^>]*>/i.test(html), 'missing experience card container');
assert(/<div\b[^>]*\bid=["']experience-grid["'][^>]*>[\s\S]*?<article class=["']skeleton-card["'] aria-hidden=["']true["']><\/article>[\s\S]*?<\/div>[\s\S]*?fetch\(['"]experiences\.json['"],\{cache:['"]no-cache['"]\}\)/i.test(html), 'loading skeleton markup is missing before experiences data loads');
assert(html.includes("document.getElementById('experience-grid')"), 'experience card container is not referenced in JavaScript');
assert(html.includes("document.createElement('article')"), 'experience card article markup is missing');
assert(html.includes("card.className='experience-card'"), 'rendered article is missing the experience-card class');
assert(html.includes('experiences.forEach(renderCard)'), 'experience entries are not rendered as cards');
assert(html.includes('No experiences listed right now — check back soon.'), 'missing experiences empty-state message');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?image\.alt\s*=\s*experience\.name/.test(html), 'rendered experience images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(experiences.length > 0, 'experiences.json has no entries');
const PAID_IDS = ['coffee-with-the-cows', 'alpaca-experience-walk', 'private-guided-farm-tour', 'virtual-farm-tour', 'birthday-party'];
const FREE_IDS = ['farm-shopping-experience', 'seasonal-events'];
for (const experience of experiences) {
  if (PAID_IDS.includes(experience.id)) {
    assert(typeof experience.checkout_url === 'string' && experience.checkout_url.startsWith('https://'), `${experience.id} is missing a real checkout_url`);
  } else if (FREE_IDS.includes(experience.id)) {
    assert(experience.checkout_url === '', `${experience.id} should have an empty checkout_url (free/RSVP entry)`);
  }
}
assert(!/groom/i.test(JSON.stringify(experiences)), 'experiences.json still contains a "groom" claim');
assert(html.includes("if(experience.checkout_url)"), 'missing checkout URL branch');
assert(html.includes("document.createElement('button'),'Reserve'"), 'missing Reserve fallback control');
assert(/<dialog\b[^>]*\bid=["']experience-sheet["']/i.test(html), 'missing reservation dialog');
assert(/<iframe\b[^>]*\bname=["']lead_iframe["']/i.test(html), 'missing hidden lead iframe');
assert(html.includes('style="width:0;height:0;border:0;position:absolute"'), 'lead iframe is not hidden');
assert(html.includes('action="https://sites.obscurastudio.design/s/tapestry-acres/__lead"'), 'missing lead endpoint form action');
assert(/<input\b[^>]*\btype=["']hidden["'][^>]*\bname=["']source["'][^>]*\bvalue=["']experiences["'][^>]*>/i.test(html), 'missing experiences source hidden field');

const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert(scripts.length > 0, 'missing inline JavaScript');
for (const script of scripts) {
  new Function(script);
}

console.log('PASS: experiences data, card rendering, reservation fallback, and JavaScript checks');
