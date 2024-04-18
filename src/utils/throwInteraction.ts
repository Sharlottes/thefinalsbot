export default async function throwInteraction(
  interaction: Discord.RepliableInteraction,
) {
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  await interaction.deleteReply().catch(() => {});
}
