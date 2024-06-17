import { ChannelType } from "discord.js";

export default class Vars {
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;
  static masterUsers: Discord.User[] = [];
  static roomMakingAnnounceChannels: Record<string, Discord.TextChannel> = {};
  static dmLogChannel: Discord.TextChannel;
  static matchMakingAnnounceChannel: Discord.TextChannel;
  static matchMakingWaitingChannel: Discord.VoiceBasedChannel;
  static banInviteGuilds: string[];

  public static async init(client: DiscordX.Client): Promise<void> {
    Vars.client = client;
    await Promise.all([
      client.guilds
        .fetch(process.env.TEST_GUILD_ID)
        .then((g) => (Vars.mainGuild = g)),
      new Promise(async (res, rej) => {
        const arr = process.env.ROOMMAKING_ANNOUNCE_CHANNELS_ID.split(",");
        const promises = [];
        for (let i = 0; i < arr.length; i += 2) {
          const name = arr[i],
            id = arr[i + 1];
          promises.push(
            client.channels
              .fetch(id)
              .then(
                (c) =>
                  (Vars.roomMakingAnnounceChannels[name] = Vars.validateChannel(
                    c,
                    ChannelType.GuildText,
                  )),
              ),
          );
        }
        await Promise.all(promises).then(res).catch(rej);
      }),
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
    Vars.banInviteGuilds = process.env.BAN_INVITE_GUILDS.split(",");
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
