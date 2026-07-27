import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./meet-the-herd.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes('id="herd-game"'), 'missing game mount');
assert(html.includes('assets/farm-steward-core.js'), 'missing pure game core runtime');
assert(html.includes('assets/herd-game.js'), 'missing focused herd game runtime');
assert(html.includes('Run five steward tasks'), 'missing five-task game promise');
assert(html.includes('day streak') || html.includes('streak'), 'missing daily streak promise');
assert(html.includes('alpacas get sheared, chickens never do'), 'missing species-appropriate task promise');
assert(!html.includes('id="farm-steward"'), 'legacy second-homepage section is still present');
assert(!html.includes('Chapter II'), 'legacy chapter homepage content is still present');
assert(!html.includes('id="finale"'), 'legacy homepage finale is still present');

const steward = JSON.parse(await readFile(new URL('./dist/data/farm-steward.v1.json', import.meta.url), 'utf8')).data;
assert(steward.animalCards.length >= 60, `game data must carry the full named herd pool (got ${steward.animalCards.length})`);
assert(steward.animalCards.filter((card) => card.photo).length >= 40, 'most cards must carry a real animal photo');
assert(steward.pastures.length >= 3, 'game data needs at least three pasture choices');
assert(steward.taskTypes.length === 5, 'game data needs the five steward task types');
assert(steward.session.roundTasks === 5, 'rounds are five tasks');
assert(steward.session.dailyStreak === true, 'daily streak must be enabled');
assert(steward.difficulty.rounds.length >= 3, 'difficulty ramp missing');

console.log('PASS: Meet the Herd hosts the Farm Steward expansion with the full verified pool, five task types, five-task rounds, a difficulty ramp, and daily-streak data.');
