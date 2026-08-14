import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { buildEmbed } from './embeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const missing = ['DISCORD_TOKEN', 'DISCORD_CHANNEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in real values (see DISCORD_BOT_SETUP.md).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    params: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});
const discord = new Client({ intents: [GatewayIntentBits.Guilds] });

const LOGO_PATH = path.join(__dirname, 'logo.png');
const BANNER_PATH = path.join(__dirname, 'banner.png');
const attachments = () => [
  new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' }),
  new AttachmentBuilder(BANNER_PATH, { name: 'banner.png' }),
];

async function getMapping(incidentId) {
  const { data, error } = await supabase
    .from('discord_messages')
    .select('*')
    .eq('incident_id', incidentId)
    .maybeSingle();
  if (error) console.error('getMapping error:', error.message);
  return data || null;
}
async function saveMapping(incidentId, channelId, messageId) {
  const { error } = await supabase
    .from('discord_messages')
    .upsert({ incident_id: incidentId, channel_id: channelId, message_id: messageId });
  if (error) console.error('saveMapping error:', error.message);
}
async function clearMapping(incidentId) {
  const { error } = await supabase.from('discord_messages').delete().eq('incident_id', incidentId);
  if (error) console.error('clearMapping error:', error.message);
}

export async function handleInsert(incident) {
  const channel = await discord.channels.fetch(DISCORD_CHANNEL_ID);
  const embed = buildEmbed(incident, { logoUrl: 'attachment://logo.png', bannerUrl: 'attachment://banner.png' });
  const msg = await channel.send({ embeds: [embed], files: attachments() });
  await saveMapping(incident.id, channel.id, msg.id);
}

export async function handleUpdate(incident) {
  const mapping = await getMapping(incident.id);
  if (!mapping) {
    // We don't have a message for this one yet (e.g. bot was offline when it was created) — post fresh.
    await handleInsert(incident);
    return;
  }
  const embed = buildEmbed(incident, { logoUrl: 'attachment://logo.png', bannerUrl: 'attachment://banner.png' });
  try {
    const channel = await discord.channels.fetch(mapping.channel_id);
    const msg = await channel.messages.fetch(mapping.message_id);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    console.error(`Could not edit message ${mapping.message_id}, posting a new one instead:`, err.message);
    await handleInsert(incident);
  }
}

export async function handleDelete(incidentId) {
  const mapping = await getMapping(incidentId);
  if (!mapping) return;
  try {
    const channel = await discord.channels.fetch(mapping.channel_id);
    const msg = await channel.messages.fetch(mapping.message_id);
    await msg.delete();
  } catch (err) {
    console.error(`Could not delete message ${mapping.message_id} (it may already be gone):`, err.message);
  }
  await clearMapping(incidentId);
}

discord.once('ready', () => {
  console.log(`Logged in as ${discord.user.tag}`);

  supabase
    .channel('bot-incidents')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
      handleInsert(payload.new).catch((err) => console.error('handleInsert failed:', err));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
      handleUpdate(payload.new).catch((err) => console.error('handleUpdate failed:', err));
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'incidents' }, (payload) => {
      handleDelete(payload.old.id).catch((err) => console.error('handleDelete failed:', err));
    })
    .subscribe((status, error) => {
  console.log('Supabase realtime status:', status);

  if (error) {
    console.error('Supabase realtime error:', error);
  }
});
});

discord.login(DISCORD_TOKEN);
