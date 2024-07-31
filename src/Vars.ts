import { ChannelType } from "discord.js";
import { Server } from "http";
import ServerSettingManager from "./core/ServerSettingManager";

export default class Vars {
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;
  static masterUsers: Discord.User[] = [];
  static roomMakingAnnounceChannels: Record<string, Discord.TextChannel> = {};
  static dmLogChannel: Discord.TextChannel;
  static matchMakingAnnounceChannel: Discord.TextChannel;
  static matchMakingWaitingChannel: Discord.VoiceBasedChannel;
  static matchMakingCategory: Discord.CategoryChannel;
  static banInviteGuilds: string[];

  public static async init(client: DiscordX.Client): Promise<void> {
    Vars.client = client;
    await Promise.all([
      client.guilds
        .fetch(process.env.TEST_GUILD_ID)
        .then((g) => (Vars.mainGuild = g)),
      ...process.env.MASTER_USERS.split(",").map((id) =>
        client.users.fetch(id).then((u) => Vars.masterUsers.push(u)),
      ),
    ]);
  }
  public static async initServerSetting(client: DiscordX.Client) {
    const serverSettings = ServerSettingManager.main.getSetting();
    if (!serverSettings) throw new Error("ServerSettings not found");
    await Promise.all([
      ...Array.from(
        serverSettings.channels.roomMakingAnnounceChannels.entries(),
      ).map(async ([name, id]) =>
        client.channels
          .fetch(id)
          .then((c) => Vars.validateChannel(c, ChannelType.GuildText))
          .then((c) => (Vars.roomMakingAnnounceChannels[name] = c)),
      ),
      client.channels
        .fetch(serverSettings.channels.dmLogChannelId)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildText))
        .then((c) => (Vars.dmLogChannel = c)),
      client.channels
        .fetch(serverSettings.channels.matchmakingWaitingChannelId)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildVoice))
        .then((c) => (Vars.matchMakingWaitingChannel = c)),
      client.channels
        .fetch(serverSettings.channels.matchmakingAnnounceChannelId)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildText))
        .then((c) => (Vars.matchMakingAnnounceChannel = c)),
      client.channels
        .fetch(serverSettings.channels.matchmakedCategoryId)
        .then((c) => Vars.validateChannel(c, ChannelType.GuildCategory))
        .then((c) => (Vars.matchMakingCategory = c)),
    ]);
    Vars.banInviteGuilds = serverSettings.channels.invalidInviteGuilds;
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
