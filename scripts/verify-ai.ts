import 'dotenv/config';
import assert from 'node:assert/strict';
import { translateIncident, translateTask } from '../server/ai';
const original = { title: 'Move 5 bags to Zone B', instructions: 'Move 5 cement bags to Zone B by 8 PM. Wear safety shoes. Do not use the broken ladder.', safetyNotes: 'Wear safety shoes. Do not use the broken ladder.' };
for (const language of ['hi', 'bn'] as const) {
  const result = await translateTask(original, 'en', language);
  const script = language === 'hi' ? /[\u0900-\u097f]/ : /[\u0980-\u09ff]/;
  assert.ok(script.test(result.instructions), `Expected ${language} script`);
  assert.ok(result.safetyNotes.length > 0);
  assert.ok(result.title !== original.title);
  console.info(`PASS live Groq English -> ${language}: structured translation, correct script, safety note present.`);
}
const english = await translateIncident('यह केवल एक काल्पनिक परीक्षण है। ज़ोन B में सीढ़ी टूटी हुई है। कोई घायल नहीं है।', 'hi');
assert.ok(/ladder|stair/i.test(english));
assert.ok(/no one|nobody|no (?:person|injur)|not (?:hurt|injured)/i.test(english));
console.info('PASS live Groq Hindi -> English report: ladder hazard and no-injury statement preserved.');
