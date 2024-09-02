import { ChannelType } from "discord.js";
import ServerSettingManager from "./core/ServerSettingManager";
import { SatoriOptions } from "satori/wasm";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import RoomMakingDataModel from "./models/RoomMakingDataModel";

export default class Vars {
  // in djs, .env
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;
  static masterUsers: Discord.User[] = [];

  // in DB
  static roomMakingAnnounceData: Record<
    string,
    {
      channel: Discord.TextChannel;
      name: string;
      description: string;
    }
  > = {};
  static dmLogChannel: Discord.TextChannel;
  static matchMakingAnnounceChannel: Discord.TextChannel;
  static matchMakingWaitingChannel: Discord.VoiceBasedChannel;
  static matchMakingCategory: Discord.CategoryChannel;
  static banInviteGuilds: string[];

  // in public
  static font: SatoriOptions["fonts"][number];
  static images: Record<string, string> = {};

  public static async init(client: DiscordX.Client): Promise<void> {
    Vars.client = client;

    await Promise.all([
      promisify(fs.readdir)(
        path.resolve(import.meta.dirname, "../public/images/ranks"),
      ).then((files) =>
        Promise.all(
          files.map((file) =>
            promisify(fs.readFile)(
              path.resolve(
                import.meta.dirname,
                `../public/images/ranks/${file}`,
              ),
              { encoding: "base64" },
            ).then((base64) => (Vars.images[file] = base64)),
          ),
        ),
      ),
      promisify(fs.readFile)(
        path.resolve(
          import.meta.dirname,
          "../public/fonts/Pretendard-Regular.otf",
        ),
      ).then(
        (data) =>
          (this.font = {
            name: "Pretendard",
            data,
            weight: 400,
            style: "normal",
          }),
      ),
      client.guilds
        .fetch(process.env.TEST_GUILD_ID)
        .then((g) => (Vars.mainGuild = g)),
      ...process.env.MASTER_USERS.split(",").map((id) =>
        client.users.fetch(id).then((u) => Vars.masterUsers.push(u)),
      ),
      RoomMakingDataModel.find().then((data) =>
        Promise.all(
          data.map(async (d) => {
            const channel = await client.channels
              .fetch(d.channelId)
              .then((c) => Vars.validateChannel(c, ChannelType.GuildText));
            Vars.roomMakingAnnounceData[channel.id] = {
              channel,
              name: d.name,
              description: d.description,
            };
          }),
        ),
      ),
    ]);
  }

  public static async initServerSetting(client: DiscordX.Client) {
    const serverSettings = ServerSettingManager.main.getSetting();
    if (!serverSettings) throw new Error("ServerSettings not found");
    await Promise.all([
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
