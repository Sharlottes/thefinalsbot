import { ChannelType } from "discord.js";

export default class Vars {
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;
  static masterUsers: Discord.User[] = [];
  static roomMakingChannels: Discord.TextChannel[] = [];
  static dmLogChannel: Discord.TextChannel;
  static matchMakingAnnounceChannel: Discord.TextChannel;
  static matchMakingWaitingChannel: Discord.VoiceBasedChannel;

  public static async init(client: DiscordX.Client): Promise<void> {
    Vars.client = client;

    await Promise.all([
      client.guilds
        .fetch(process.env.TEST_GUILD_ID)
        .then((g) => (Vars.mainGuild = g)),
      ...process.env.ROOMMAKING_ANNOUNCE_CHANNELS_ID.split(",").map((id) =>
        client.channels
          .fetch(id)
          .then((c) =>
            Vars.roomMakingChannels.push(
              Vars.validateChannel(c, ChannelType.GuildText),
            ),
          ),
      ),
      ...process.env.MASTER_USERS.split(",").map((id) =>
        client.users.fetch(id).then((u) => Vars.masterUsers.push(u)),
      ),
      client.channels
        .fetch(process.env.DM_LOG_CHANNEL_ID)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildText))
        .then((c) => (Vars.dmLogChannel = c)),
      client.channels
        .fetch(process.env.MATCHMAKING_WAITING_CHANNEL_ID)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildVoice))
        .then((c) => (Vars.matchMakingWaitingChannel = c)),
      client.channels
        .fetch(process.env.MATCHMAKING_ANNOUNCE_CHANNEL_ID)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildText))
        .then((c) => (Vars.matchMakingAnnounceChannel = c)),
    ]);
  }

  public static validateChannel<CT extends ChannelType>(
    channel: Discord.Channel | null,
    type: CT,
  ): Discord.Channel & { type: CT } {
    if (!channel) {
      throw new Error("Channel not found");
    } else if (channel.type !== type) {
      throw new Error("Channel is not valid");
    }
    return channel as any;
  }
}
