export default async function throwInteraction(
  interaction: Discord.RepliableInteraction,
) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply().catch(() => {});
}
