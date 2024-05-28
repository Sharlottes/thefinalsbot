export default async function autoDeleteMessage(
  message:
    | Promise<Discord.Message | Discord.InteractionResponse>
    | Discord.Message
    | Discord.InteractionResponse,
  time = 3000,
) {
  const m = await Promise.resolve(message);

  setTimeout(async () => {
    m.delete().catch(() => {});
  }, time);
}
