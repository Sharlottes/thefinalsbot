import ServerSettingModel, { ChannelsSchema, ServerSettingData } from "@/models/ServerSettingModel";
import Vars from "@/Vars";
import { ActionRowBuilder, bold, ButtonBuilder, ButtonStyle, ChannelType, OverwriteType } from "discord.js";
import {
  InputResolvers,
  PrimitiveInputResolver,
  PrimitiveInputType,
} from "../discord/messageManagers/inputs/InputResolvers";
import ArrayInputMessageManager from "@/discord/messageManagers/inputs/ArrayInputMessageManager";
import PrimitiveInputMessageManager from "@/discord/messageManagers/inputs/PrimitiveInputMessageManager";
import ObjectInputMessageManager from "@/discord/messageManagers/inputs/ObjectInputMessageManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";

const channelMap: Record<keyof ServerSettingData["channels"], { name: string; type: keyof typeof InputResolvers }> = {
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
};
export default class ServerSettingManager {
  static #main: ServerSettingManager;
  public static get main(): ServerSettingManager {
    return this.#main ?? (ServerSettingManager.#main = new ServerSettingManager());
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
      await this.requestSettingInit(guild);
    }
  }

  async requestSettingInit(guild: Discord.Guild) {
    const allChannels = await guild.channels.fetch();
    await Promise.all(
      allChannels.map(async (channel) => {
        if (channel?.name !== "server-init") return;
        await channel.delete();
      }),
    );

    const channel = await guild.channels.create({
      type: ChannelType.GuildText,
      name: "server-init",
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
          id: guild.roles.everyone,
          deny: "ViewChannel",
        },
        {
          type: OverwriteType.Role,
          id: guild.roles.highest,
          allow: "ViewChannel",
        },
      ],
    });
    channel.send("서버 설정 준비중...");
    const setting =
      (await ServerSettingModel.findOne({
        guildId: guild.id,
        botId: Vars.client.user!.id,
      })) ??
      new ServerSettingModel({
        guildId: guild.id,
        botId: Vars.client.user!.id,
        channels: {
          dmLogChannelId: "",
          matchmakedCategoryId: "",
          matchmakingAnnounceChannelId: "",
          matchmakingWaitingChannelId: "",
          invalidInviteGuilds: [],
        },
      });
    const interaction = await channel
      .send({
        content: `서버 설정이 없습니다.
세부 설정 버튼을 눌러 서버 설정을 완료하세요.
${bold("서버 설정을 완료치 않으면 봇 기능을 이용할 수 없습니다!")}`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("setting_detail").setLabel("세부 설정").setStyle(ButtonStyle.Primary),
          ),
        ],
      })
      .then((msg) => msg.awaitMessageComponent());

    await interaction.deferReply();
    const render = () => interaction.editReply(msg.join("\n"));

    let msg = ["* 세부 설정을 시작합니다..."];
    await render();
    for (const key of Object.keys(ChannelsSchema.obj) as unknown as Array<keyof ServerSettingData["channels"]>) {
      const i = msg.push(`* ${bold(channelMap[key].name)}을(를) 설정하세요.`) - 1;

      await render();
      const [value, str] = await this.resolveSettingInput(channel, channelMap[key].type, key);
      if (!value) continue;
      // @ts-ignore
      setting.channels[key] = value;

      msg[i] += `..   ${str}`;
    }
    await setting.save();
    msg.push("* 설정이 완료되었습니다!");
    await render();
    this.settingMap.set(guild.id, setting);
  }

  private async resolveSettingInput(
    channel: Discord.TextBasedChannel,
    type: keyof typeof InputResolvers,
    key: keyof ServerSettingData["channels"],
    value?: string | string[] | Record<string, string>,
  ): Promise<[string | string[] | Record<string, string> | undefined, string]> {
    const valueType = ChannelsSchema.obj[key];
    const resolver: PrimitiveInputResolver<PrimitiveInputType> = InputResolvers[type];

    if (!valueType) return [undefined, ""];
    if (valueType === String) {
      while (true) {
        const input = await PrimitiveInputMessageManager.createOnChannel(channel, {
          inputResolver: resolver,
          value: value as string,
        });
        if (!input.value) {
          autoDeleteMessage(channel.send("입력이 취소되어 다시 시도합니다."), 1500);
          continue;
        }
        return [this.serializeValue(input.value), input.getValueString()];
      }
    } else if (Array.isArray(valueType)) {
      while (true) {
        const input = await ArrayInputMessageManager.createOnChannel(channel, {
          inputResolver: resolver,
          value: value as string[],
        });
        if (!input.value) {
          autoDeleteMessage(channel.send("입력이 취소되어 다시 시도합니다."), 1500);
          continue;
        }
        return [input.value.map((v) => this.serializeValue(v)), input.getValueString()];
      }
    } else {
      while (true) {
        const input = await ObjectInputMessageManager.createOnChannel(channel, {
          inputResolver: resolver,
          value: value as Record<string, string>,
        });
        if (!input.value) {
          autoDeleteMessage(channel.send("입력이 취소되어 다시 시도합니다."), 1500);
          continue;
        }
        return [
          Object.fromEntries(Object.entries(input.value).map(([k, v]) => [k, this.serializeValue(v)])),
          input.getValueString(),
        ];
      }
    }
  }

  private serializeValue(value: PrimitiveInputType) {
    if (typeof value === "string") return value;
    if ("id" in value) return value.id;

    throw new Error("there are non-implemented input value in serializeValue()!");
  }
}
