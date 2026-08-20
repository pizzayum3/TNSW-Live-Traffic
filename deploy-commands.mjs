import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { reportCommand } from './commands/report.mjs';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in your .env — see DISCORD_BOT_SETUP.md.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function main() {
  const commands = [reportCommand];

  if (DISCORD_GUILD_ID) {
    // Guild-scoped commands show up instantly — best while you're testing.
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log(`Registered ${commands.length} command(s) to guild ${DISCORD_GUILD_ID}.`);
  } else {
    // Global commands work in every server the bot is in, but can take up to
    // an hour to show up everywhere the first time.
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log(`Registered ${commands.length} command(s) globally (may take up to an hour to appear).`);
  }
}

main().catch((err) => {
  console.error('Failed to register commands:', err);
  process.exit(1);
});
