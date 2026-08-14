import assert from 'node:assert/strict';
import { buildEmbed } from '../embeds.js';

const base = {
  id: 'test-1',
  type: 'crash',
  level: 'heavy',
  status: 'current',
  title: null,
  location: 'Riverside',
  road: 'Riverside Drive',
  road_type: 'state',
  schedule: null,
  description: 'Multi-vehicle collision blocking two lanes.',
  advice: 'Use an alternative route.',
  diversions: 'Via Colonial Drive.',
  units: 'LCSO-4, LCFD Engine 2',
  created_by_name: 'Trooper Reyes',
  created_at: Date.now(),
  updated_at: Date.now(),
  updates: [{ time: Date.now(), text: 'Second lane reopened.' }],
};

// 1. Active heavy crash -> red-ish color, not marked resolved
{
  const embed = buildEmbed(base, { logoUrl: 'attachment://logo.png', bannerUrl: 'attachment://banner.png' });
  const data = embed.toJSON();
  assert.equal(data.color, 0x8B1E1E, 'heavy crash should use the heavy color');
  assert.match(data.title, /Crash/);
  assert.ok(!data.title.includes('RESOLVED'));
  assert.ok(data.fields.some(f => f.name === 'Location' && f.value === 'Riverside'));
  assert.ok(data.fields.some(f => f.name === 'Advice'));
  assert.ok(data.fields.some(f => f.name === 'Latest updates'));
  assert.equal(data.image.url, 'attachment://banner.png');
  console.log('PASS: active heavy crash embed');
}

// 2. Resolved incident -> ended color, regardless of level
{
  const resolved = { ...base, status: 'resolved' };
  const embed = buildEmbed(resolved, {});
  const data = embed.toJSON();
  assert.equal(data.color, 0xB9C0C9, 'resolved incidents should use the ended color');
  assert.ok(data.fields.some(f => f.name === 'Level' && f.value === 'Ended'));
  console.log('PASS: resolved incident embed');
}

// 3. Type with a custom title, and a type with binary levels (event)
{
  const event = {
    ...base, type: 'event', level: 'active', title: 'Founders Day Parade',
    road: null, schedule: 'Sat 20 Aug, 10am–2pm', advice: null, diversions: null, units: null, updates: [],
  };
  const embed = buildEmbed(event, {});
  const data = embed.toJSON();
  assert.match(data.title, /Founders Day Parade/);
  assert.ok(data.fields.some(f => f.name === 'Schedule'));
  assert.ok(!data.fields.some(f => f.name === 'Advice'), 'should omit empty optional fields');
  console.log('PASS: public event embed with custom title');
}

// 4. Unknown type id doesn't throw (defensive fallback)
{
  const weird = { ...base, type: 'not_a_real_type', level: 'whatever' };
  const embed = buildEmbed(weird, {});
  assert.ok(embed.toJSON().title.length > 0);
  console.log('PASS: unknown type falls back safely');
}

console.log('\nAll embed tests passed.');
