import { EmbedBuilder } from 'discord.js';
import { typeInfo, colorInt } from './types.js';

const GREY = 0x9AA5B1;
const GREEN = 0x1c8a52;
const RED = 0xc8202f;

/**
 * The embed posted in the command-review channel for Command to act on.
 */
export function buildReportReviewEmbed(report) {
  const t = typeInfo(report.type);
  const embed = new EmbedBuilder()
    .setColor(colorInt('#1958c9'))
    .setTitle(`New report: ${t.label}`)
    .addFields(
      { name: 'Postal', value: report.postal, inline: true },
      { name: 'Type', value: t.label, inline: true },
      { name: 'Reported by', value: `<@${report.reporter_discord_id}> (${report.reporter_username || 'unknown'})`, inline: true },
    )
    .setImage(report.evidence_url)
    .setFooter({ text: `Report ID: ${report.id}` })
    .setTimestamp(new Date(report.created_at));
  if (report.description) embed.addFields({ name: 'Description', value: report.description });
  return embed;
}

/**
 * What the review embed becomes after Command acts on it (edited in place,
 * buttons removed) — keeps a visible record without needing to delete it.
 */
export function buildReportDecidedEmbed(report) {
  const base = buildReportReviewEmbed(report);
  const map = {
    approved: { color: GREEN, label: '✅ Approved' },
    denied: { color: RED, label: '❌ Denied' },
    denied_blacklisted: { color: RED, label: '🚫 Denied — reporter blacklisted' },
  };
  const outcome = map[report.status] || { color: GREY, label: report.status };
  base.setColor(outcome.color);
  base.addFields({
    name: 'Decision',
    value: `${outcome.label} by ${report.reviewed_by_name || 'Command'}`,
  });
  return base;
}

/**
 * Ephemeral confirmation shown to the civilian right after they submit.
 */
export function buildReportSubmittedEmbed(report) {
  const t = typeInfo(report.type);
  return new EmbedBuilder()
    .setColor(colorInt('#1958c9'))
    .setTitle('Report submitted')
    .setDescription(`Your ${t.label.toLowerCase()} report at postal ${report.postal} has been sent to Command for review. You'll be notified once it's actioned.`);
}

/**
 * DM'd (or ephemerally shown, if DMs are closed) to the reporter once decided.
 */
export function buildReportOutcomeEmbed(report) {
  const t = typeInfo(report.type);
  if (report.status === 'approved') {
    return new EmbedBuilder()
      .setColor(GREEN)
      .setTitle('Report approved')
      .setDescription(`Your ${t.label.toLowerCase()} report at postal ${report.postal} was approved and is being added to Live Traffic NSW. Thanks for the report.`);
  }
  const blacklisted = report.status === 'denied_blacklisted';
  return new EmbedBuilder()
    .setColor(RED)
    .setTitle(blacklisted ? 'Report denied — you have been blacklisted' : 'Report denied')
    .setDescription(
      blacklisted
        ? `Your report at postal ${report.postal} was reviewed and determined to be false. You have been blocked from submitting further reports. Contact Command if you believe this is a mistake.`
        : `Your ${t.label.toLowerCase()} report at postal ${report.postal} was reviewed and not approved.`
    );
}

/**
 * A ready-to-copy summary so Command can quickly finish adding an approved
 * report to the live map through the website (which needs a real map pin
 * click — that part can't be automated from a postal number alone).
 */
export function buildAddToSiteSummary(report) {
  const t = typeInfo(report.type);
  const lines = [
    `Type: ${t.label}`,
    `Postal: ${report.postal}`,
  ];
  if (report.description) lines.push(`Description: ${report.description}`);
  lines.push(`Reported by: ${report.reporter_username || report.reporter_discord_id}`);
  return lines.join('\n');
}
