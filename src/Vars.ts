export default class Vars {
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;
  static roomMakingChannels: Discord.TextChannel[] = [];

  public static async init(client: DiscordX.Client): Promise<void> {
    Vars.client = client;
    Vars.mainGuild = await client.guilds.fetch(process.env.TEST_GUILD_ID);
    Vars.roomMakingChannels = (await Promise.all(
      process.env.ROOMMAKING_ANNOUNCE_CHANNELS_ID.split(",").map((id) =>
        Vars.mainGuild.channels.fetch(id),
      ),
    )) as Discord.TextChannel[];
  }
}
