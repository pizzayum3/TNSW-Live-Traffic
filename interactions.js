import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { isCommandMember, isBlacklisted, blacklistUser } from './permissions.js';
import {
  buildReportReviewEmbed,
  buildReportDecidedEmbed,
  buildReportSubmittedEmbed,
  buildReportOutcomeEmbed,
  buildAddToSiteSummary,
} from './reports.js';

function reviewButtons(reportId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`report_approve_${reportId}`).setLabel('Approve').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`report_deny_${reportId}`).setLabel('Deny').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`report_blacklist_${reportId}`).setLabel('Deny & Blacklist').setStyle(ButtonStyle.Danger),
  );
}

/**
 * Wires up the /report command and its review buttons on the given Discord
 * client. Kept as a single function (rather than spread across bot.js) so
 * the whole reporting feature can be tested by calling this once against a
 * fake client/supabase and firing fake interactions at it.
 */
export function registerReportInteractions(discord, supabase, { reviewChannelId }) {
  discord.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'report') {
        await handleReportCommand(interaction, supabase, reviewChannelId);
        return;
      }
      if (interaction.isButton() && interaction.customId.startsWith('report_')) {
        await handleReviewButton(interaction, supabase);
        return;
      }
    } catch (err) {
      console.error('Interaction handling failed:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Something went wrong handling that — please try again.', ephemeral: true }).catch(() => {});
      }
    }
  });
}

async function handleReportCommand(interaction, supabase, reviewChannelId) {
  const discordId = interaction.user.id;

  if (await isBlacklisted(supabase, discordId)) {
    await interaction.reply({ content: 'You have been blocked from submitting reports.', ephemeral: true });
    return;
  }

  const type = interaction.options.getString('type', true);
  const postal = interaction.options.getString('postal', true);
  const description = interaction.options.getString('description') || null;
  const evidence = interaction.options.getAttachment('evidence', true);

  if (!evidence.contentType || !evidence.contentType.startsWith('image/')) {
    await interaction.reply({ content: 'Evidence has to be an image file.', ephemeral: true });
    return;
  }

  const { data: inserted, error } = await supabase
    .from('civilian_reports')
    .insert({
      reporter_discord_id: discordId,
      reporter_username: interaction.user.username,
      type,
      postal,
      description,
      evidence_url: evidence.url,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('Failed to save report:', error && error.message);
    await interaction.reply({ content: 'Could not submit your report — please try again shortly.', ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [buildReportSubmittedEmbed(inserted)], ephemeral: true });

  const reviewChannel = await interaction.client.channels.fetch(reviewChannelId);
  const reviewMsg = await reviewChannel.send({
    embeds: [buildReportReviewEmbed(inserted)],
    components: [reviewButtons(inserted.id)],
  });

  await supabase
    .from('civilian_reports')
    .update({ channel_id: reviewMsg.channel.id, message_id: reviewMsg.id })
    .eq('id', inserted.id);
}

async function handleReviewButton(interaction, supabase) {
  const [, action, reportId] = interaction.customId.split('_');
  // customId is report_<action>_<uuid>; action is 'approve' | 'deny' | 'blacklist'.
  const fullAction = interaction.customId.replace(/^report_/, '').replace(/_[0-9a-f-]{36}$/, '');

  const isCommand = await isCommandMember(supabase, interaction.user.id);
  if (!isCommand) {
    await interaction.reply({ content: 'Only Command members can review reports.', ephemeral: true });
    return;
  }

  const { data: report } = await supabase.from('civilian_reports').select('*').eq('id', reportId).maybeSingle();
  if (!report) {
    await interaction.reply({ content: 'That report no longer exists.', ephemeral: true });
    return;
  }
  if (report.status !== 'pending') {
    await interaction.reply({ content: 'That report has already been reviewed.', ephemeral: true });
    return;
  }

  const status = fullAction === 'approve' ? 'approved' : fullAction === 'blacklist' ? 'denied_blacklisted' : 'denied';

  const { data: updated } = await supabase
    .from('civilian_reports')
    .update({
      status,
      reviewed_by_discord: interaction.user.id,
      reviewed_by_name: interaction.user.username,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (status === 'denied_blacklisted') {
    await blacklistUser(supabase, {
      discordId: report.reporter_discord_id,
      username: report.reporter_username,
      reason: `False report (${reportId})`,
      byName: interaction.user.username,
    });
  }

  await interaction.update({ embeds: [buildReportDecidedEmbed(updated)], components: [] });

  if (status === 'approved') {
    await interaction.followUp({
      content: `Ready to add to the live map:\n\`\`\`\n${buildAddToSiteSummary(updated)}\n\`\`\`\nOpen the site, click **+ Report incident**, and place the pin at postal ${updated.postal}.`,
      ephemeral: true,
    });
  }

  try {
    const reporter = await interaction.client.users.fetch(report.reporter_discord_id);
    await reporter.send({ embeds: [buildReportOutcomeEmbed(updated)] });
  } catch {
    // Reporter has DMs closed — nothing more we can do about notifying them.
  }
}
