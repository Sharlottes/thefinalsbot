export default function emoji_return(
  message: Discord.Message<boolean> | undefined,
  interaction: Discord.Interaction,
) {
  const reaction = message?.reactions.cache.filter((re) =>
    re.users.cache.has(interaction.client.user.id),
  );
  if (reaction)
    for (const message_reaction of reaction.values()) {
      message_reaction.users.remove(interaction.client.user.id);
    }
}
