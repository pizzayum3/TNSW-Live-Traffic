import { EmbedBuilder } from 'discord.js';
import { typeInfo, levelInfo, colorInt, ENDED_COLOR } from './types.js';

/**
 * Builds a Discord embed for one incident. Pure function — no network calls —
 * so it can be unit tested without a live bot/database connection.
 */
export function buildEmbed(incident, { logoUrl, bannerUrl } = {}) {
  const t = typeInfo(incident.type);
  const lvl = levelInfo(incident.type, incident.level);
  const isResolved = incident.status === 'resolved';
  const color = isResolved ? colorInt(ENDED_COLOR) : colorInt(lvl.color);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${t.icon} ${incident.title || t.label}`)
    .setDescription(incident.description || '—')
    .setFooter({ text: 'Live Traffic NSW · Liberty County RP', iconURL: logoUrl || undefined })
    .setTimestamp(new Date(incident.updated_at || incident.created_at));

  const fields = [
    { name: 'Location', value: incident.location || '—', inline: true },
  ];
  if (incident.road) fields.push({ name: 'Road', value: incident.road, inline: true });
  fields.push({ name: 'Level', value: isResolved ? 'Ended' : lvl.label, inline: true });
  fields.push({ name: 'Status', value: incident.status, inline: true });
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
  if (bannerUrl) embed.setImage(bannerUrl);
  return embed;
}
