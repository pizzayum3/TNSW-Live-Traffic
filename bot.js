import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { buildEmbed } from './embeds.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const {
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const missing = [
  'DISCORD_TOKEN',
  'DISCORD_CHANNEL_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
].filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `Missing required environment variable(s): ${missing.join(', ')}`
  );
  console.error(
    'Check your Railway environment variables and DISCORD_BOT_SETUP.md.'
  );
  process.exit(1);
}

// ============================================================
// FILE PATHS
// ============================================================

const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');
const BANNER_PATH = path.join(__dirname, 'assets', 'banner.png');

// Check that the image files actually exist.
console.log('Checking image files...');

if (!fs.existsSync(LOGO_PATH)) {
  console.error(`ERROR: Logo file not found: ${LOGO_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(BANNER_PATH)) {
  console.error(`ERROR: Banner file not found: ${BANNER_PATH}`);
  process.exit(1);
}

console.log(`Logo found: ${LOGO_PATH}`);
console.log(`Banner found: ${BANNER_PATH}`);

// ============================================================
// DISCORD + SUPABASE
// ============================================================

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      params: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  }
);

const discord = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ============================================================
// DISCORD ATTACHMENTS
// ============================================================

const attachments = () => [
  new AttachmentBuilder(LOGO_PATH, {
    name: 'logo.png',
  }),

  new AttachmentBuilder(BANNER_PATH, {
    name: 'banner.png',
  }),
];

// ============================================================
// SUPABASE MESSAGE MAPPING
// ============================================================

async function getMapping(incidentId) {
  const { data, error } = await supabase
    .from('discord_messages')
    .select('*')
    .eq('incident_id', incidentId)
    .maybeSingle();

  if (error) {
    console.error('getMapping error:', error.message);
  }

  return data || null;
}

async function saveMapping(
  incidentId,
  channelId,
  messageId
) {
  const { error } = await supabase
    .from('discord_messages')
    .upsert({
      incident_id: incidentId,
      channel_id: channelId,
      message_id: messageId,
    });

  if (error) {
    console.error(
      'saveMapping error:',
      error.message
    );
  }
}

async function clearMapping(incidentId) {
  const { error } = await supabase
    .from('discord_messages')
    .delete()
    .eq('incident_id', incidentId);

  if (error) {
    console.error(
      'clearMapping error:',
      error.message
    );
  }
}

// ============================================================
// INSERT
// ============================================================

export async function handleInsert(incident) {
  const channel = await discord.channels.fetch(
    DISCORD_CHANNEL_ID
  );

  const embed = buildEmbed(incident, {
    logoUrl: 'attachment://logo.png',
    bannerUrl: 'attachment://banner.png',
  });

  const msg = await channel.send({
    embeds: [embed],
    files: attachments(),
  });

  await saveMapping(
    incident.id,
    channel.id,
    msg.id
  );
}

// ============================================================
// UPDATE
// ============================================================

export async function handleUpdate(incident) {
  const mapping = await getMapping(incident.id);

  if (!mapping) {
    // No existing Discord message.
    // Create one instead.
    await handleInsert(incident);
    return;
  }

  const embed = buildEmbed(incident, {
    logoUrl: 'attachment://logo.png',
    bannerUrl: 'attachment://banner.png',
  });

  try {
    const channel = await discord.channels.fetch(
      mapping.channel_id
    );

    const msg = await channel.messages.fetch(
      mapping.message_id
    );

    await msg.edit({
      embeds: [embed],
    });
  } catch (err) {
    console.error(
      `Could not edit message ${mapping.message_id}, posting a new one instead:`,
      err.message
    );

    await handleInsert(incident);
  }
}

// ============================================================
// DELETE
// ============================================================

export async function handleDelete(incidentId) {
  const mapping = await getMapping(incidentId);

  if (!mapping) {
    return;
  }

  try {
    const channel = await discord.channels.fetch(
      mapping.channel_id
    );

    const msg = await channel.messages.fetch(
      mapping.message_id
    );

    await msg.delete();
  } catch (err) {
    console.error(
      `Could not delete message ${mapping.message_id} (it may already be gone):`,
      err.message
    );
  }

  await clearMapping(incidentId);
}

// ============================================================
// DISCORD READY
// ============================================================

discord.once('ready', () => {
  console.log(
    `Logged in as ${discord.user.tag}`
  );

  supabase
    .channel('bot-incidents')

    // INSERT
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'incidents',
      },
      (payload) => {
        handleInsert(payload.new).catch(
          (err) =>
            console.error(
              'handleInsert failed:',
              err
            )
        );
      }
    )

    // UPDATE
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'incidents',
      },
      (payload) => {
        handleUpdate(payload.new).catch(
          (err) =>
            console.error(
              'handleUpdate failed:',
              err
            )
        );
      }
    )

    // DELETE
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'incidents',
      },
      (payload) => {
        handleDelete(payload.old.id).catch(
          (err) =>
            console.error(
              'handleDelete failed:',
              err
            )
        );
      }
    )

    // REALTIME STATUS
    .subscribe((status, error) => {
      console.log(
        'Supabase realtime status:',
        status
      );

      if (error) {
        console.error(
          'Supabase realtime error:',
          error
        );
      }
    });
});

// ============================================================
// LOGIN
// ============================================================

discord.login(DISCORD_TOKEN);