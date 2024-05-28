import autoDeleteMessage from "@/utils/autoDeleteMessage";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  bold,
} from "discord.js";
import { ButtonComponent, Discord, On } from "discordx";

const MAX_MATCH = 1;
type MatchMakingType = "general" | "rank1" | "rank2";
@Discord()
export default class MatchMaker {
  #matchMakingMessage!: Discord.Message;
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
    const channel = await guild.channels.fetch(
      process.env.MATCHMAKING_CHANNEL_ID,
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
  }

  public async rerender() {
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

  @ButtonComponent({ id: "general_match_button" })
  async generalMatchButton(interaction: Discord.ButtonInteraction) {
    this.cancelMatch(interaction.user.id);
    this.matchQueue.general.push(interaction.user);
    this.matchingUsers.add(interaction.user.id);
    autoDeleteMessage(
      interaction.reply({
        content: `${bold("일반전")} 매치메이킹을 시작합니다...`,
        ephemeral: true,
      }),
    );
    await this.rerender();
    await this.validateMatch();
  }

  @ButtonComponent({ id: "rank1_match_button" })
  async rank1MatchButton(interaction: Discord.ButtonInteraction) {
    this.cancelMatch(interaction.user.id);
    this.matchQueue.rank1.push(interaction.user);
    this.matchingUsers.add(interaction.user.id);
    autoDeleteMessage(
      interaction.reply({
        content: `${bold("브실골 경쟁전")} 매치메이킹을 시작합니다...`,
        ephemeral: true,
      }),
    );
    await this.rerender();
    await this.validateMatch();
  }

  @ButtonComponent({ id: "rank2_match_button" })
  async rank2MatchButton(interaction: Discord.ButtonInteraction) {
    this.cancelMatch(interaction.user.id);
    this.matchQueue.rank2.push(interaction.user);
    this.matchingUsers.add(interaction.user.id);
    autoDeleteMessage(
      interaction.reply({
        content: `${bold("플다 경쟁전")} 매치메이킹을 시작합니다...`,
        ephemeral: true,
      }),
    );
    await this.rerender();
    await this.validateMatch();
  }

  @ButtonComponent({ id: "cancel_button" })
  async cancelButton(interaction: Discord.ButtonInteraction) {
    this.cancelMatch(interaction.user.id);
    await this.rerender();
    await this.validateMatch();
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
      const users = queue.splice(0, MAX_MATCH);

      const context: MatchMakingContext = {
        sessions: [],
        matchMaker: this,
        type: key as MatchMakingType,
      };
      for (const user of users) {
        context.sessions.push(new MatchMakingSession(user, context));
      }
      context.sessions.forEach((session) => session.init());
    }
  }
}

type MatchMakingContext = {
  sessions: MatchMakingSession[];
  matchMaker: MatchMaker;
  type: MatchMakingType;
};
class MatchMakingSession {
  public isAggree: boolean = false;
  public message?: Discord.Message;

  constructor(
    public readonly user: Discord.User,
    public readonly context: MatchMakingContext,
  ) {}

  private async getDMChannel() {
    return this.user.dmChannel || (await this.user.createDM());
  }

  public async init() {
    const dmChannel = await this.getDMChannel();
    this.message = await dmChannel.send(this.buildMessage());
    const buttonInteraction = await this.message.awaitMessageComponent();
    this.message.delete();
    switch (buttonInteraction.customId) {
      case "join_voice_channel":
        autoDeleteMessage(buttonInteraction.reply("확인되었습니다."));
        this.isAggree = true;
        this.context.sessions.forEach((session) => session.rerender());
        break;
      case "cancel_voice_channel":
        autoDeleteMessage(buttonInteraction.reply("취소되었습니다."));
        this.isAggree = false;
        this.context.sessions.forEach((session) => {
          if (session.user.id !== this.user.id) session.onCanceled();
        });
        break;
    }
  }

  buildMessage() {
    return {
      embeds: [
        new EmbedBuilder().setTitle("매치메이킹 준비 중...").setDescription(
          `
* 매치메이킹을 위한 인원이 모두 모였습니다.
* 디소코드의 개인 보안으로 인해 <#${process.env.MATCHMAKING_WAITING_CHANNEL_ID}>에 먼저 입장해야 합니다.
* 현재 대기 중인 팀원:` +
            this.context.sessions
              .map(
                (session) =>
                  bold(session.user.username) +
                  (session.isAggree
                    ? " :white_check_mark:"
                    : " :white_large_square:"),
              )
              .join(", "),
        ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("join_voice_channel")
            .setLabel("음성 채널 입장")
            .setStyle(ButtonStyle.Primary),
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
    this.message.edit(this.buildMessage());
    if (this.context.sessions.every((session) => session.isAggree)) {
      const matchMakeGuild = this.context.matchMaker.matchMakingMessage.guild!;
      const voiceChannel = await matchMakeGuild.channels.create({
        type: ChannelType.GuildVoice,
        name: `${this.context.type} 매치메이킹`,
        parent: "1122181326095790170",
      });
      this.context.sessions.map(async (session) => {
        const member = await matchMakeGuild.members.fetch(session.user.id);
        member.voice.setChannel(voiceChannel);
      });
    }
  }

  async onCanceled() {
    const message = await (this.message
      ? this.message.edit(this.buildCancelMessage())
      : this.getDMChannel().then((channel) =>
          channel.send(this.buildCancelMessage()),
        ));

    const buttonInteraction = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
    });
    switch (buttonInteraction.customId) {
      case "rematch_button":
        switch (this.context.type) {
          case "general":
            this.context.matchMaker.generalMatchButton(buttonInteraction);
            break;
          case "rank1":
            this.context.matchMaker.rank1MatchButton(buttonInteraction);
            break;
          case "rank2":
            this.context.matchMaker.rank2MatchButton(buttonInteraction);
            break;
        }
        break;
      case "cancel_rematch_button":
        autoDeleteMessage(buttonInteraction.reply("확인되었습니다."));
        break;
    }
  }
}
