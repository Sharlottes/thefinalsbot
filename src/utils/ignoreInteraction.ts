export default async (interaction: Discord.BaseInteraction) => {
  if (!interaction.isRepliable()) return;
  if (interaction.replied || interaction.deferred) return;

  const res = await interaction.deferReply({ ephemeral: true });
  res.delete();
};
