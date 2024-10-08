import autoDeleteMessage from "@/utils/autoDeleteMessage";
import getDMChannel from "@/utils/getDMChannel";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, bold } from "discord.js";
import { Discord, On } from "discordx";
import FixedMessageRegister from "../../core/FixedMessageRegister";
import VoiceChannelManager from "../../core/VoiceChannelManager";
import Vars from "@/Vars";
import PColors from "@/constants/PColors";

const MAX_MATCH = 3;
const keyMap = {
  general: "일반전",
  rank: "경쟁전",
  free: "자유방",
} as const;
type MatchMakingType = "general" | "rank" | "free";

@Discord()
export default class MatchMaker {
  #matchMakingMessage?: Discord.Message;

  public readonly matchContextes = new Set<MatchMakingContext>();
  public readonly matchingUsers = new Set<string>();
  public readonly matchQueue: Record<MatchMakingType, Discord.User[]> = {
    general: [],
    rank: [],
    free: [],
  };
  get matchMakingMessage() {
    return this.#matchMakingMessage;
  }
  public static main: MatchMaker;

  constructor() {
    MatchMaker.main = this;
  }

  public async init(): Promise<void> {
    console.time("Initializing MatchMaker...");

    this.#matchMakingMessage = await FixedMessageRegister.sendMessage(Vars.matchMakingAnnounceChannel, "waiting...");
    await this.rerender();

    console.timeEnd("Initializing MatchMaker...");
  }

  @On({ event: "voiceStateUpdate" })
  async onVoiceStateUpdate([oldState, newState]: DiscordX.ArgsOf<"voiceStateUpdate">) {
    if (
      oldState.guild.id !== Vars.matchMakingWaitingChannel?.guildId &&
      newState.guild.id !== Vars.matchMakingWaitingChannel?.guildId
    ) {
      return;
    }

    if (
      oldState.channelId === Vars.matchMakingWaitingChannel.id ||
      newState.channelId === Vars.matchMakingWaitingChannel.id
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
    }
  }

  @On({ event: "interactionCreate" })
  async onInteractionCreate([interaction]: DiscordX.ArgsOf<"interactionCreate">) {
    if (!interaction.isButton()) return;
    if (interaction.message.id !== this.#matchMakingMessage?.id) return;
    this.handleMatchButton(interaction, interaction.customId as any);
  }

  async handleMatchButton(
    interaction: Discord.RepliableInteraction,
    interactionId: "cancel_button" | "general_match_button" | "rank_match_button" | "free_match_button",
  ) {
    this.cancelMatch(interaction.user.id);
    switch (interactionId) {
      case "cancel_button":
        autoDeleteMessage(
          interaction.reply({
            content: `매치메이킹을 취소했습니다`,
            ephemeral: true,
          }),
        );
        break;
      case "free_match_button":
        const voiceChannel = await VoiceChannelManager.createVoiceChannel(`${keyMap.free} 매치메이킹`, {
          owner: interaction.user,
        });
        await autoDeleteMessage(
          interaction.reply({
            content: `자유방이 생성되었습니다. 
[바로가기](discord://-/channels/${voiceChannel.guildId}/${voiceChannel.id})`,
            ephemeral: true,
          }),
        );
        break;
      default:
        const queueType = interactionId.replace("_match_button", "") as MatchMakingType,
          queueTypeName = keyMap[queueType];
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
    await this.validateMatch(interaction);
    await this.rerender();
  }

  async rerender() {
    this.#matchMakingMessage = await this.#matchMakingMessage?.edit({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("매치메이커")
          .setDescription(
            `
* 매치메이커를 이용해 게임을 찾아보세요.
* 매치메이커는 랜덤으로 게임을 찾아주는 기능입니다.
* 게임을 찾고 싶다면 아래 버튼을 눌러주세요.

${bold("대기자 수")}`,
          )
          .setFields(
            Object.entries(keyMap)
              .filter(([k, v]) => k !== "free")
              .map(([key, value]) => ({
                name: value,
                value: this.matchQueue[key as MatchMakingType].length + "명",
                inline: true,
              })),
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...Object.entries(keyMap).map(([key, value]) =>
            new ButtonBuilder().setCustomId(`${key}_match_button`).setLabel(value).setStyle(ButtonStyle.Primary),
          ),
          new ButtonBuilder().setCustomId("cancel_button").setLabel("취소").setStyle(ButtonStyle.Secondary),
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

  async validateMatch(interaction: Discord.RepliableInteraction) {
    for (const [key, queue] of Object.entries(this.matchQueue)) {
      if (queue.length < MAX_MATCH) continue;

      const context = new MatchMakingContext(this, key as MatchMakingType, interaction.user);
      while (context.sessions.length < MAX_MATCH) {
        const user = queue.shift()!;
        context.sessions.push(new MatchMakingSession(user, context));
      }
      this.matchContextes.add(context);
      context.sessions.forEach((session) => session.init());
    }
  }
}

class MatchMakingContext {
  public readonly sessions: MatchMakingSession[] = [];
  public voiceChannel?: Discord.VoiceBasedChannel;

  constructor(
    public readonly matchMaker: MatchMaker,
    public readonly type: MatchMakingType,
    public readonly craetor: Discord.User,
  ) {}

  async createRoom() {
    const voiceChannel = await VoiceChannelManager.createVoiceChannel(`${keyMap[this.type]} 매치메이킹`, {
      owner: this.craetor,
    });
    this.voiceChannel = voiceChannel;

    await Promise.all(
      this.sessions.map(async (session) => {
        const member = await this.matchMaker.matchMakingMessage?.guild?.members.fetch(session.user.id);
        member?.voice.setChannel(voiceChannel);
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
      this.context.sessions.forEach((session) => session.onCanceled());
    }
  }

  async isJoined() {
    const channel = await Vars.matchMakingWaitingChannel?.fetch();
    return !!channel?.members.has(this.user.id);
  }

  async buildMessage() {
    let usersStr = "";
    for (const session of this.context.sessions) {
      const isJoined = await session.isJoined();
      usersStr += bold(session.user.username) + (isJoined ? " :white_check_mark:" : " :white_large_square:") + ", ";
    }

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("매치메이킹 하는중...")
          .setDescription(
            `
* 모드: ${keyMap[this.context.type]}
* 모집인원: ~${MAX_MATCH}인
* 디소코드의 개인 보안으로 인해 ⁠THE FINALS TEAMS ⁠대기실에 먼저 입장해야 합니다.
* 현재 대기 중인 팀원:` + usersStr,
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("대기실 입장")
            .setURL(
              `discord://-/channels/${Vars.matchMakingWaitingChannel?.guildId}/${Vars.matchMakingWaitingChannel?.id}`,
            )
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder().setCustomId("cancel_voice_channel").setLabel("매칭 취소").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  async rerender() {
    if (!this.message) return;
    const message = await this.buildMessage();
    await this.message.edit(message);
  }

  buildCancelMessage() {
    return {
      embeds: [
        new EmbedBuilder().setColor(PColors.primary).setTitle("매치메이킹 취소됨").setDescription(`
* 누군가에 의해 매치메이킹이 취소되었습니다.
* 다시 매치메이킹을 시작하려면 아래 버튼을 눌러주세요.`),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("rematch_button")
            .setLabel("다시 매치메이킹 시작하기")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("cancel_rematch_button").setLabel("취소").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  async onCanceled() {
    const message = await this.message!.edit(this.buildCancelMessage());
    const buttonInteraction = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
    });

    switch (buttonInteraction.customId) {
      case "rematch_button":
        this.context.matchMaker.handleMatchButton(buttonInteraction, (this.context.type + "_match_button") as any);
        break;
      case "cancel_rematch_button":
        autoDeleteMessage(buttonInteraction.reply("확인되었습니다."));
        break;
    }
  }
}
