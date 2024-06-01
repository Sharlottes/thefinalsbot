export default async function getDMChannel(
  user: Discord.User,
): Promise<Discord.DMChannel> {
  return user.dmChannel || (await user.createDM());
}
