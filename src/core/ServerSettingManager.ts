import ServerSettingModel from "@/models/ServerSetting";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import { Channel } from "diagnostics_channel";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageCollector,
  OverwriteType,
} from "discord.js";
import { Guild } from "discordx";

const channelNames: Record<keyof ServerSettingData["channels"], string> = {
  dmLogChannelId: "DM 로그 채널",
  matchmakedCategoryId: "매치메이킹된 방들이 들어갈 카테고리",
  matchmakingAnnounceChannelId: "매치메이킹 고정임베드 채널",
  matchmakingWaitingChannelId: "매치메이킹 대기방 채널",
  roomMakingAnnounceChannels: "방 생성 고정임베드 채널",
  invalidInviteGuilds: "초대링크 차단된 서버들",
};
export default class ServerSettingManager {
  private readonly settingMap: Map<string, ServerSettingData> = new Map();

  public getSetting(guildId: string): ServerSettingData {
    return this.settingMap.get(guildId)!;
  }

  public async init(client: DiscordX.Client): Promise<void> {
    const guild = Vars.mainGuild;
    const serverSettings = await ServerSettingModel.findOne({
      guildId: guild.id,
      botId: client.user!.id,
    });
    if (true) {
      //  if (!serverSettings) {
      this.requestSettingInit(guild, client);
    }
    // this.settingMap.set(guild.id, serverSettings);
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
    await setting.save();
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
    const render = () => interaction.editReply(msg);

    let msg = "* 세부 설정을 시작합니다...";
    await render();
    for (const [key, name] of Object.entries(setting.channels)) {
      msg += `\n* ${bold(channelNames[key as keyof ServerSettingData["channels"]])}을(를) 설정하세요.`;
      await render();
    }
  }

  private resolveSettingInput<T>(
    key: keyof ServerSettingData["channels"],
    value: T | Record<string, T> | T[] | null | undefined,
  ) {}
}

abstract class Input<
  T extends string | Array<string> | Record<string, string>,
  OT = {},
> {
  protected msg!: Discord.Message;
  public value: T | undefined;

  abstract askInput(): Promise<T>;

  constructor(
    protected readonly channel: Discord.TextBasedChannel,
    protected readonly options: OT & {
      validator?: { callback: (value: T) => boolean; invalidMessage: string };
    },
  ) {}

  protected async askConfirm(): Promise<boolean> {
    this.msg = await this.msg.edit({
      content: `입력 완료: ${this.getValueString()}로 확정할까요?`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("input_yes")
            .setLabel("예")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("input_no")
            .setLabel("아니요")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
    const interaction = await this.msg.awaitMessageComponent();
    if (interaction.customId == "input_yes") {
      await Promise.all([
        autoDeleteMessage(interaction.reply("입력이 완료되었습니다.")),
        this.msg.delete(),
      ]);
      return true;
    } else {
      await autoDeleteMessage(interaction.reply("입력이 취소되었습니다."));
      return false;
    }
  }

  protected getValueString() {
    if (this.value === undefined) return "없음";
    else if (typeof this.value === "string") return this.value;
    else if (Array.isArray(this.value)) return this.value.join(", ");
    else {
      return Object.entries(this.value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }
  }

  protected async validate() {
    if (this.value === undefined) {
      await this.msg.edit("입력 실패. 재시도합니다.");
      return false;
    } else if (
      this.options.validator &&
      !this.options.validator.callback(this.value)
    ) {
      await this.msg.edit(this.options.validator.invalidMessage);
      return false;
    }
    return true;
  }
}

class TextInput extends Input<string> {
  public async askInput(): Promise<string> {
    while (true) {
      this.msg = await this.channel.send("입력 대기중...");
      this.value = await this.channel
        .awaitMessages({
          max: 1,
          ...this.options,
        })
        .then((messages) => messages.first()?.content);

      const isValid = await this.validate();
      if (!isValid) continue;
      const isConfirmed = await this.askConfirm();
      if (!isConfirmed) continue;
      return this.value!;
    }
  }
}

interface ArrayInputOptions {
  maxLength?: number;
}
class ArrayInput extends Input<Array<string>, ArrayInputOptions> {
  async askInput(): Promise<string[]> {
    this.value = [];

    while (true) {
      this.msg = await this.channel.send(`입력 대기중...
* 순서대로 메시지를 보내주세요. ${this.options.maxLength === undefined ? "" : `(${this.options.maxLength}개까지 가능)`}
* 중도 편집
* 입력을 마치려면 👍이모지를 눌러주세요.
        `);
      await this.msg.react("👍");
      await new Promise<void>((resolve) => {
        const rCollector = this.msg.createReactionCollector();

        const mCollector = this.channel.createMessageCollector();
        rCollector.on("collect", (reaction) => {
          if (reaction.emoji.name !== "👍") return;
          resolve();
        });
        mCollector.on("collect", (msg) => {
          this.value!.push(msg.content);
        });
      });

      const isValid = await this.validate();
      if (!isValid) continue;
      const isConfirmed = await this.askConfirm();
      if (!isConfirmed) continue;
      return this.value!;
    }
  }
}

class ObjectInput extends Input<Record<string, string>> {
  async askInput(): Promise<Record<string, string>> {
    this.value = {};

    while (true) {
      this.msg = await this.channel.send(`입력 대기중...
* 순서대로 메시지를 보내주세요.
* 입력을 마치려면 👍이모지를 눌러주세요.
        `);
      await this.msg.react("👍");
      await new Promise<void>((resolve) => {
        const rCollector = this.msg.createReactionCollector();

        const mCollector = this.channel.createMessageCollector();
        rCollector.on("collect", (reaction) => {
          if (reaction.emoji.name !== "👍") return;
          resolve();
        });
        mCollector.on("collect", (msg) => {
          this.value!.push(msg.content);
        });
      });

      const isValid = await this.validate();
      if (!isValid) continue;
      const isConfirmed = await this.askConfirm();
      if (!isConfirmed) continue;
      return this.value!;
    }
  }
}
