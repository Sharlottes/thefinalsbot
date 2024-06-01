import autoDeleteMessage from "@/utils/autoDeleteMessage";
import getDMChannel from "@/utils/getDMChannel";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  bold,
} from "discord.js";
import { Discord, On } from "discordx";

const MAX_MATCH = 1;
type MatchMakingType = "general" | "rank1" | "rank2";
const idMap = {
  general: "general_match_button",
  rank1: "rank1_match_button",
  rank2: "rank2_match_button",
} as const;
const keyMap: Record<
  string,
  [MatchMakingType, "일반전" | "브실골 경쟁전" | "플다 경쟁전"]
> = {
  general_match_button: ["general", "일반전"],
  rank1_match_button: ["rank1", "브실골 경쟁전"],
  rank2_match_button: ["rank2", "플다 경쟁전"],
};

@Discord()
export default class MatchMaker {
  #matchMakingMessage!: Discord.Message;
  waitingChannel!: Discord.VoiceBasedChannel;

  public readonly matchContextes = new Set<MatchMakingContext>();
  public readonly matchingUsers = new Set<string>();
  public readonly matchQueue: Record<MatchMakingType, Discord.User[]> = {
    general: [],
    rank1: [],
    rank2: [],
  };
  get matchMakingMessage() {
    return this.#matchMakingMessage;
  }

  @On({ event: "ready" })
  private async ready(
    _: DiscordX.ArgsOf<"ready">,
    client: DiscordX.Client,
  ): Promise<void> {
    const guild = await client.guilds.fetch(process.env.TEST_GUILD_ID);
    const waitingChannel = await guild.channels.fetch(
      process.env.MATCHMAKING_WAITING_CHANNEL_ID,
    );
    if (!waitingChannel?.isVoiceBased())
      throw new Error("WAITING CHANNEL IS NOT FOUND OR NOT VOICE BASED");
    this.waitingChannel = waitingChannel;

    const channel = await guild.channels.fetch(
      process.env.MATCHMAKING_ANNOUNCE_CHANNEL_ID,
    );
    if (!channel) throw new Error("CANNOT FIND MATCHMAKING CHANNEL");
    if (channel.type !== ChannelType.GuildText)
      throw new Error("CHANNEL IS NOT TEXT BASED");
    const messages = await channel.messages.fetch();
    await Promise.all(messages.map((message) => message.delete()));
    this.#matchMakingMessage = await channel.send("waiting...");
    await this.rerender();

    client.on("messageCreate", async (message) => {
      if (!this.#matchMakingMessage) return;
      if (this.#matchMakingMessage.channel.id !== message.channel.id) return;
      message.delete();
    });

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.message.id !== this.#matchMakingMessage.id) return;

      this.handleMatchButton(interaction, interaction.customId as any);
    });
  }

  async handleMatchButton(
    interaction: Discord.RepliableInteraction,
    interactionId:
      | "cancel_button"
      | "general_match_button"
      | "rank1_match_button"
      | "rank2_match_button",
  ) {
    this.cancelMatch(interaction.user.id);
    // 취소 시 그냥 스킵
    if (interactionId !== "cancel_button") {
      const [queueType, queueTypeName] = keyMap[interactionId];
      this.matchQueue[queueType].push(interaction.user);
      this.matchingUsers.add(interaction.user.id);
      autoDeleteMessage(
        interaction.reply({
          content: `${bold(queueTypeName)} 매치메이킹을 시작합니다...`,
          ephemeral: true,
        }),
      );
    }
    await this.rerender();
    await this.validateMatch();
    await this.rerender();
  }

  async rerender() {
    this.#matchMakingMessage = await this.#matchMakingMessage.edit({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setTitle("매치메이커")
          .setDescription(
            `
* 매치메이커를 이용해 게임을 찾아보세요.
* 매치메이커는 랜덤으로 게임을 찾아주는 기능입니다.
* 게임을 찾고 싶다면 아래 버튼을 눌러주세요.

${bold("대기자 수")}`,
          )
          .setFields(
            {
              name: "일반전",
              value: this.matchQueue.general.length + "명",
              inline: true,
            },
            {
              name: "브실골 경쟁전",
              value: this.matchQueue.rank1.length + "명",
              inline: true,
            },
            {
              name: "플다 경쟁전",
              value: this.matchQueue.rank2.length + "명",
              inline: true,
            },
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("general_match_button")
            .setLabel("일반전")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("rank1_match_button")
            .setLabel("브실골 경쟁전")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("rank2_match_button")
            .setLabel("플다 경쟁전")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("cancel_button")
            .setLabel("취소")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
  }

  cancelMatch(userId: string) {
    if (!this.matchingUsers.has(userId)) return;
    this.matchingUsers.delete(userId);

    for (const queue of Object.values(this.matchQueue)) {
      const idx = queue.findIndex((u) => u.id == userId);
      if (idx !== -1) queue.splice(idx, 1);
    }
  }

  async validateMatch() {
    for (const [key, queue] of Object.entries(this.matchQueue)) {
      if (queue.length < MAX_MATCH) continue;

      const context = new MatchMakingContext(this, key as MatchMakingType);
      while (context.sessions.length < MAX_MATCH) {
        const user = queue.shift()!;
        context.sessions.push(new MatchMakingSession(user, context));
      }
      this.matchContextes.add(context);
      context.sessions.forEach((session) => session.init());
    }
  }

  @On({ event: "voiceStateUpdate" })
  async onVoiceStateUpdate([
    oldState,
    newState,
  ]: DiscordX.ArgsOf<"voiceStateUpdate">) {
    if (
      oldState.guild.id !== this.waitingChannel.guildId &&
      newState.guild.id !== this.waitingChannel.guildId
    )
      return;

    if (
      oldState.channelId === this.waitingChannel.id ||
      newState.channelId === this.waitingChannel.id
    ) {
      const promises: Promise<unknown>[] = [];

      for (const context of this.matchContextes) {
        promises.push(
          new Promise(async () => {
            let isAllJoined = true;
            await Promise.all(
              context.sessions.map(async (session) => {
                await session.rerender();
                const isJoined = await session.isJoined();
                isAllJoined &&= isJoined;
              }),
            );
            if (isAllJoined) {
              await context.createRoom();
            }
          }),
        );
      }
      await Promise.all(promises);
      await this.rerender();
    } else {
      this.matchContextes.forEach(async (context) => {
        if (context.voiceChannel?.members.size === 0) {
          await context.voiceChannel.delete();
          this.matchContextes.delete(context);
        }
      });
    }
  }
}

class MatchMakingContext {
  public readonly sessions: MatchMakingSession[] = [];
  public voiceChannel?: Discord.VoiceBasedChannel;

  constructor(
    public readonly matchMaker: MatchMaker,
    public readonly type: MatchMakingType,
  ) {}

  async createRoom() {
    const matchMakeGuild = this.matchMaker.matchMakingMessage.guild!;
    const voiceChannel = await matchMakeGuild.channels.create({
      type: ChannelType.GuildVoice,
      name: `${keyMap[idMap[this.type]][1]} 매치메이킹`,
      parent: process.env.MATCHMAKED_ROOM_CATEGORY_ID,
    });
    this.voiceChannel = voiceChannel;
    await Promise.all(
      this.sessions.map(async (session) => {
        const member = await matchMakeGuild.members.fetch(session.user.id);
        member.voice.setChannel(voiceChannel);
      }),
    );
  }
}

class MatchMakingSession {
  public message?: Discord.Message;

  constructor(
    public readonly user: Discord.User,
    public readonly context: MatchMakingContext,
  ) {}

  public async init() {
    const dmChannel = await getDMChannel(this.user);
    const message = await this.buildMessage();
    this.message = await dmChannel.send(message);
    const buttonInteraction = await this.message.awaitMessageComponent();
    this.message.delete();
    if (buttonInteraction.customId == "cancel_voice_channel") {
      autoDeleteMessage(buttonInteraction.reply("취소되었습니다."));
      this.context.sessions.forEach((session) => {
        if (session.user.id !== this.user.id) session.onCanceled();
      });
    }
  }

  async isJoined() {
    const channel = await this.context.matchMaker.waitingChannel.fetch();
    return channel.members.has(this.user.id);
  }

  async buildMessage() {
    let usersStr = "";
    for (const session of this.context.sessions) {
      const isJoined = await session.isJoined();
      usersStr +=
        bold(session.user.username) +
        (isJoined ? " :white_check_mark:" : " :white_large_square:") +
        ", ";
    }

    return {
      embeds: [
        new EmbedBuilder().setTitle("매치메이킹 준비 중...").setDescription(
          `
* 매치메이킹을 위한 인원이 모두 모였습니다.
* 디소코드의 개인 보안으로 인해 <#${process.env.MATCHMAKING_WAITING_CHANNEL_ID}>에 먼저 입장해야 합니다.
* 현재 대기 중인 팀원:` + usersStr,
        ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("음성 채널 입장")
            .setURL(
              `discord://-/channels/${this.context.matchMaker.waitingChannel.guildId}/${this.context.matchMaker.waitingChannel.id}`,
            )
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setCustomId("cancel_voice_channel")
            .setLabel("취소")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  buildCancelMessage() {
    return {
      embeds: [
        new EmbedBuilder().setTitle("매치메이킹 취소됨").setDescription(`
* 누군가에 의해 매치메이킹이 취소되었습니다.
* 다시 매치메이킹을 시작하려면 아래 버튼을 눌러주세요.`),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("rematch_button")
            .setLabel("음성 채널 입장")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("cancel_rematch_button")
            .setLabel("취소")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  async rerender() {
    if (!this.message) return;
    const message = await this.buildMessage();
    await this.message.edit(message);
  }

  async onCanceled() {
    const message = await (this.message
      ? this.message.edit(this.buildCancelMessage())
      : getDMChannel(this.user).then((channel) =>
          channel.send(this.buildCancelMessage()),
        ));

    const buttonInteraction = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
    });

    switch (buttonInteraction.customId) {
      case "rematch_button":
        this.context.matchMaker.handleMatchButton(
          buttonInteraction,
          idMap[this.context.type],
        );
        break;
      case "cancel_rematch_button":
        autoDeleteMessage(buttonInteraction.reply("확인되었습니다."));
        break;
    }
  }
}
