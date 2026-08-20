/**
 * These talk to Supabase using whatever client the bot passes in — kept
 * separate from bot.js so they're easy to test with a fake client.
 */

export async function isCommandMember(supabase, discordId) {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('role, roles(level)')
    .eq('discord_id', discordId)
    .maybeSingle();
  if (error || !data) return false;
  const level = data.roles ? data.roles.level : null;
  return level === 'command';
}

export async function isBlacklisted(supabase, discordId) {
  const { data } = await supabase
    .from('blacklisted_reporters')
    .select('discord_id')
    .eq('discord_id', discordId)
    .maybeSingle();
  return !!data;
}

export async function blacklistUser(supabase, { discordId, username, reason, byName }) {
  const { error } = await supabase.from('blacklisted_reporters').upsert({
    discord_id: discordId,
    discord_username: username || null,
    reason: reason || null,
    blacklisted_by: byName || null,
  });
  if (error) console.error('blacklistUser error:', error.message);
}
