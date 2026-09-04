import { EmbedBuilder } from 'discord.js';

const ACTION_STYLE = {
  created: { color: 0x1c8a52, label: '🆕 Created' },
  updated: { color: 0x1958c9, label: '✏️ Updated' },
  deleted: { color: 0xc8202f, label: '🗑️ Deleted' },
};

/**
 * Builds the embed posted to the command-log channel for one command_log row.
 * Pure function — no network calls — testable without a live connection.
 */
export function buildCommandLogEmbed(entry) {
  const style = ACTION_STYLE[entry.action] || { color: 0x9AA5B1, label: entry.action };
  const seconds = Math.floor(new Date(entry.created_at).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(style.label)
    .addFields(
      {
        name: 'Performed by',
        value: entry.actor_discord ? `<@${entry.actor_discord}> (${entry.actor_name || 'unknown'})` : (entry.actor_name || 'unknown'),
        inline: true,
      },
      { name: 'When', value: `<t:${seconds}:F> (<t:${seconds}:R>)`, inline: true },
    );

  if (entry.detail) embed.addFields({ name: 'Change', value: entry.detail });
  if (entry.incident_id) embed.setFooter({ text: `Incident ID: ${entry.incident_id}` });

  return embed;
}
