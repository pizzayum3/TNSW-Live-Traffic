import { SlashCommandBuilder } from 'discord.js';
import { TYPES } from '../types.js';

export const reportCommand = new SlashCommandBuilder()
  .setName('report')
  .setDescription('Report a traffic incident for Live Traffic NSW to review')
  .addStringOption((opt) =>
    opt
      .setName('type')
      .setDescription('What kind of incident is this?')
      .setRequired(true)
      .addChoices(...TYPES.map((t) => ({ name: t.label, value: t.id })))
  )
  .addStringOption((opt) =>
    opt.setName('postal').setDescription('Nearest postal/zone number').setRequired(true)
  )
  .addAttachmentOption((opt) =>
    opt.setName('evidence').setDescription('Photo evidence of the incident').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('description').setDescription('Any extra details (optional)').setRequired(false)
  )
  .toJSON();
