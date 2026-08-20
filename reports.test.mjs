import assert from 'node:assert/strict';
import { buildReportReviewEmbed, buildReportDecidedEmbed, buildAddToSiteSummary } from '../reports.js';

const report = {
  id: 'abc-123',
  reporter_discord_id: '999',
  reporter_username: 'someuser',
  type: 'crash',
  postal: '206',
  description: 'Two cars, blocking one lane',
  evidence_url: 'https://cdn.discordapp.com/attachments/x/y/photo.png',
  status: 'pending',
  created_at: Date.now(),
};

{
  const data = buildReportReviewEmbed(report).toJSON();
  assert.match(data.title, /Crash/);
  assert.ok(data.fields.some(f => f.name === 'Postal' && f.value === '206'));
  assert.ok(data.fields.some(f => f.name === 'Reported by' && f.value.includes('999')));
  assert.equal(data.image.url, report.evidence_url);
  console.log('PASS: review embed');
}

{
  const approved = { ...report, status: 'approved', reviewed_by_name: 'CmdUser' };
  const data = buildReportDecidedEmbed(approved).toJSON();
  assert.ok(data.fields.some(f => f.name === 'Decision' && f.value.includes('Approved') && f.value.includes('CmdUser')));
  console.log('PASS: decided embed (approved)');
}

{
  const blacklisted = { ...report, status: 'denied_blacklisted', reviewed_by_name: 'CmdUser' };
  const data = buildReportDecidedEmbed(blacklisted).toJSON();
  assert.ok(data.fields.some(f => f.name === 'Decision' && f.value.includes('blacklisted')));
  console.log('PASS: decided embed (blacklisted)');
}

{
  const summary = buildAddToSiteSummary(report);
  assert.match(summary, /Postal: 206/);
  assert.match(summary, /Crash/);
  console.log('PASS: add-to-site summary');
}

console.log('\nAll report embed tests passed.');
