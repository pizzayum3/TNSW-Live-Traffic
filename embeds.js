import { EmbedBuilder } from 'discord.js';
import { typeInfo, levelInfo, colorInt, ENDED_COLOR, iconFileName } from './types.js';

const BLUE = '#1958c9';
const GREY = ENDED_COLOR;

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Which icon PNG (in assets/icons/) represents this incident right now.
 */
export function resolveIconFileName(incident) {
  const isResolved = incident.status === 'resolved';
  return iconFileName(incident.type, incident.level, isResolved);
}

/**
 * The small summary-color used for the banner card:
 * grey once resolved, blue when there's an Advice note to highlight,
 * otherwise the same yellow/orange/red severity color as the main embed.
 */
function bannerColor(incident) {
  const isResolved = incident.status === 'resolved';
  if (isResolved) return colorInt(GREY);
  if (incident.advice) return colorInt(BLUE);
  const lvl = levelInfo(incident.type, incident.level);
  return colorInt(lvl.color);
}

/**
 * The slim "banner" card — sent as the FIRST embed in the message so it
 * renders above the main incident card in the same Discord message.
 */
export function buildBannerEmbed(incident, { bannerUrl } = {}) {
  const embed = new EmbedBuilder().setColor(bannerColor(incident));
  if (bannerUrl) embed.setImage(bannerUrl);
  return embed;
}

/**
 * Builds the main Discord embed for one incident. Pure function — no network
 * calls — so it can be unit tested without a live bot/database connection.
 */
export function buildEmbed(incident, { logoUrl, iconUrl } = {}) {
  const t = typeInfo(incident.type);
  const lvl = levelInfo(incident.type, incident.level);
  const isResolved = incident.status === 'resolved';
  const color = isResolved ? colorInt(ENDED_COLOR) : colorInt(lvl.color);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: t.label, iconURL: iconUrl || undefined })
    .setTitle(incident.title || t.label)
    .setDescription(incident.description || '—')
    .setFooter({ text: 'Live Traffic NSW', iconURL: logoUrl || undefined })
    .setTimestamp(new Date(incident.updated_at || incident.created_at));

  const fields = [
    { name: 'Road', value: incident.location || '—', inline: true },
  ];
  if (incident.road) fields.push({ name: 'Postal', value: incident.road, inline: true });
  fields.push({ name: 'Level', value: isResolved ? 'Ended' : lvl.label, inline: true });
  fields.push({ name: 'Status', value: capitalize(incident.status), inline: true });
  if (incident.road_type) fields.push({ name: 'Road type', value: incident.road_type === 'state' ? 'State road' : 'Local road', inline: true });
  if (incident.units) fields.push({ name: 'Units on scene', value: incident.units, inline: true });
  if (incident.schedule) fields.push({ name: 'Schedule', value: incident.schedule });
  if (incident.advice) fields.push({ name: 'Advice', value: incident.advice });
  if (incident.diversions) fields.push({ name: 'Diversions', value: incident.diversions });

  const updates = Array.isArray(incident.updates) ? incident.updates.slice(-3).reverse() : [];
  if (updates.length) {
    const text = updates
      .map((u) => `<t:${Math.floor(u.time / 1000)}:t> ${u.text}`)
      .join('\n');
    fields.push({ name: 'Latest updates', value: text });
  }

  embed.addFields(fields);
  return embed;
}
