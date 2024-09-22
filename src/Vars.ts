import { ChannelType } from "discord.js";
import ServerSettingManager from "./core/ServerSettingManager";
import { SatoriOptions } from "satori/wasm";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import RoomMakingDataModel from "./models/RoomMakingDataModel";
import { ChangeStreamDocument } from "mongodb";
import RoomsMakerService from "./discord/features/roommake/RoomsMakerService";
import FixedMessageRegister from "./core/FixedMessageRegister";

const awaitReadFile = promisify(fs.readFile);
const awaitReadDir = promisify(fs.readdir);

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

    const dirname = import.meta.url.replace("file:///", "").replaceAll("/", "\\");

    const publicDir =
      process.env.NODE_ENV === "development"
        ? path.resolve(dirname, "../../public")
        : path.resolve(dirname, "../public");
    const ranksImgDir = path.resolve(publicDir, "./images/ranks");
    const fontDir = path.resolve(publicDir, "./fonts/Pretendard-Regular.woff");
    await Promise.all([
      new Promise<void>(async (res) => {
        const files = await awaitReadDir(ranksImgDir);
        await Promise.all(
          files.map(async (file) => {
            const base64 = await awaitReadFile(path.resolve(ranksImgDir, `./${file}`), {
              encoding: "base64",
            });
            Vars.images[file] = base64;
          }),
        );
        res();
      }),
      awaitReadFile(fontDir).then(
        (data) =>
          (this.font = {
            name: "Pretendard",
            data,
            weight: 400,
            style: "normal",
          }),
      ),
      client.guilds.fetch(process.env.TEST_GUILD_ID).then((g) => (Vars.mainGuild = g)),
      ...process.env.MASTER_USERS.split(",").map((id) => client.users.fetch(id).then((u) => Vars.masterUsers.push(u))),
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

    RoomMakingDataModel.watch<RoomMakingDataData, ChangeStreamDocument<RoomMakingDataData>>([], {
      fullDocument: "updateLookup",
      fullDocumentBeforeChange: "required",
    }).on("change", async (data) => {
      if (data.operationType === "delete") {
        const channel = await Vars.client.channels
          .fetch(data.fullDocumentBeforeChange!.channelId)
          .then((c) => Vars.validateChannel(c, ChannelType.GuildText));
        delete Vars.roomMakingAnnounceData[channel.id];
        await FixedMessageRegister.cancelMessage(channel);
      } else if (data.operationType === "update" || data.operationType === "insert") {
        const channel = await client.channels
          .fetch(data.fullDocument!.channelId)
          .then((c) => Vars.validateChannel(c, ChannelType.GuildText));
        Vars.roomMakingAnnounceData[channel.id] = {
          channel,
          name: data.fullDocument!.name,
          description: data.fullDocument!.description,
        };
        await RoomsMakerService.main.init();
      }
    });
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
