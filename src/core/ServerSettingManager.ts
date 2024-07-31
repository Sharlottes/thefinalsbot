import ServerSettingModel, { ChannelsSchema } from "@/models/ServerSetting";
import Vars from "@/Vars";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
} from "discord.js";
import { TextInput, ArrayInput, ObjectInput } from "./Inputs";
import {
  InputResolvers,
  PrimitiveInputResolver,
  PrimitiveInputType,
} from "./InputResolvers";

const channelMap: Record<
  keyof ServerSettingData["channels"],
  { name: string; type: keyof typeof InputResolvers }
> = {
  dmLogChannelId: { name: "DM 로그 채널", type: "channel" },
  matchmakedCategoryId: {
    name: "매치메이킹된 방들이 들어갈 카테고리",
    type: "category",
  },
  matchmakingAnnounceChannelId: {
    name: "매치메이킹 고정임베드 채널",
    type: "channel",
  },
  matchmakingWaitingChannelId: {
    name: "매치메이킹 대기방 채널",
    type: "channel",
  },
  invalidInviteGuilds: { name: "초대링크 차단된 서버들", type: "guild" },
  roomMakingAnnounceChannels: {
    name: "방 생성 고정임베드 채널",
    type: "channel",
  },
};
export default class ServerSettingManager {
  static #main: ServerSettingManager;
  public static get main(): ServerSettingManager {
    return (
      this.#main ?? (ServerSettingManager.#main = new ServerSettingManager())
    );
  }
  private readonly settingMap: Map<string, ServerSettingData> = new Map();
  private constructor() {}
  public getSetting(guildId: string = Vars.mainGuild.id): ServerSettingData {
    return this.settingMap.get(guildId)!;
  }

  public async init(client: DiscordX.Client): Promise<void> {
    const guild = Vars.mainGuild;
    const serverSettings = await ServerSettingModel.findOne({
      guildId: guild.id,
      botId: client.user!.id,
    });
    if (serverSettings) {
      this.settingMap.set(guild.id, serverSettings);
    } else {
      await this.requestSettingInit(guild, client);
    }
  }

  async requestSettingInit(guild: Discord.Guild, client: DiscordX.Client) {
    const channel = await guild.channels.create({
      type: ChannelType.GuildText,
      name: "server init",
      permissionOverwrites: [
        ...Vars.masterUsers.map(
          (user) =>
            ({
              type: OverwriteType.Member,
              id: user.id,
              allow: "ViewChannel",
            }) as const,
        ),

        {
          type: OverwriteType.Role,
          id: guild.roles.highest,
          allow: "ViewChannel",
        },
      ],
    });
    channel.send("서버 설정이 없습니다. 설정을 초기화합니다...");
    const setting = new ServerSettingModel({
      guildId: guild.id,
      botId: client.user!.id,
      channels: {
        dmLogChannelId: "",
        matchmakedCategoryId: "",
        matchmakingAnnounceChannelId: "",
        matchmakingWaitingChannelId: "",
        roomMakingAnnounceChannels: {},
        invalidInviteGuilds: [],
      },
    });
    const interaction = await channel
      .send({
        content:
          "서버 설정 초기화가 완료되었습니다.\n세부 설정 버튼을 눌러 서버 설정을 완료하세요.",
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("setting_detail")
              .setLabel("세부 설정")
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      })
      .then((msg) => msg.awaitMessageComponent());

    await interaction.deferReply();
    const render = () => interaction.editReply(msg.join("\n"));

    let msg = ["* 세부 설정을 시작합니다..."];
    await render();
    for (const key of Object.keys(ChannelsSchema.obj) as unknown as Array<
      keyof ServerSettingData["channels"]
    >) {
      const i =
        msg.push(`* ${bold(channelMap[key].name)}을(를) 설정하세요.`) - 1;

      await render();
      const [value, str] = await this.resolveSettingInput(
        channel,
        channelMap[key].type,
        key,
      );
      if (!value) continue;
      // @ts-ignore
      setting.channels[key] = value;

      msg[i] += `..   ${str}`;
    }
    await setting.save();
    msg.push("* 설정이 완료되었습니다!");
    await render();
  }

  private async resolveSettingInput(
    channel: Discord.TextBasedChannel,
    type: keyof typeof InputResolvers,
    key: keyof ServerSettingData["channels"],
  ): Promise<[string | string[] | Record<string, string> | undefined, string]> {
    const valueType = ChannelsSchema.obj[key];
    const resolver: PrimitiveInputResolver<PrimitiveInputType> =
      InputResolvers[type];

    if (!valueType) return [undefined, ""];
    if (valueType === String) {
      const input = new TextInput(channel, resolver);
      await input.start();
      return [this.serializeValue(input.value), input.getValueString()];
    } else if (Array.isArray(valueType)) {
      const input = new ArrayInput(channel, resolver);
      await input.start();

      return [
        input.value.map((v) => this.serializeValue(v)),
        input.getValueString(),
      ];
    } else {
      const input = new ObjectInput(channel, resolver);
      await input.start();
      return [
        Object.fromEntries(
          Object.entries(input.value).map(([k, v]) => [
            k,
            this.serializeValue(v),
          ]),
        ),
        input.getValueString(),
      ];
    }
  }

  private serializeValue(value: PrimitiveInputType) {
    if (typeof value === "string") return value;
    if ("id" in value) return value.id;

    throw new Error(
      "there are non-implemented input value in serializeValue()!",
    );
  }
}
