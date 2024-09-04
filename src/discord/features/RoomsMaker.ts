import FixedMessageRegister from "@/core/FixedMessageRegister";
import Vars from "@/Vars";
import VoiceChannelManager from "@/core/VoiceChannelManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  inlineCode,
  userMention,
} from "discord.js";
import { ButtonComponent, Discord, On } from "discordx";
import PColors from "@/constants/PColors";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";

export default class RoomMaker {
  public static readonly main = new this();
  public readonly data: RoomData[] = [];

  public async init(): Promise<void> {
    console.time("initalizing RoomsMaker...");
    await Promise.all(
      Object.entries(Vars.roomMakingAnnounceData).map(
        async ([channelId, { channel, name, description }]) => {
          this.data.push(new RoomData(name, channel));
          await FixedMessageRegister.sendMessage(
            channel,
            RoomMaker.buildChannelMessage(name, description),
          );
        },
      ),
    );
    console.timeEnd("initalizing RoomsMaker...");
  }

  public static buildChannelMessage(name: string, description: string) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle(name + " LFG")
          .setDescription(description),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("create_voice_channel-" + name)
            .setLabel("새 음성방 생성하기")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("show_voice_channel_invite-" + name)
            .setLabel("음성방 초대링크 확인하기")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("change_voice_channel_capacity-" + name)
            .setLabel("음성방 인원 변경하기")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  public async getUserVoiceChannel(
    interaction: Discord.ButtonInteraction<"cached">,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    return member.voice.channel;
  }

  public findDataByName(name: string) {
    for (const d of this.data) {
      if (d.name == name) return d;
    }
    return null;
  }

  public findDataByChannelId(channelId: string) {
    for (const d of this.data) {
      for (const channel of d.channels) {
        if (channel.id == channelId) return d;
      }
    }
    return null;
  }

  public sendErrorMessage(
    interaction: Discord.RepliableInteraction,
    content: string,
  ) {
    autoDeleteMessage(
      ErrorMessageManager.createOnInteraction(
        interaction,
        {
          description: content,
        },
        {
          ephemeral: true,
        },
      ).then((m) => m.message),
    );
  }
}

@Discord()
class RoomsMakerHandler {
  @ButtonComponent({ id: /create_voice_channel-.*/ })
  private async createVoiceChannel(interaction: Discord.ButtonInteraction) {
    const roomType = interaction.customId.split("-")[1];
    const name = roomType + " 대화방";
    const voiceChannel = await VoiceChannelManager.createVoiceChannel(name, {
      owner: interaction.user,
    });

    const data = RoomMaker.main.findDataByName(roomType);
    if (!data) return;
    data.channels.add(voiceChannel);
    data.messages.set(voiceChannel.id, []);
    await autoDeleteMessage(
      interaction.reply({
        content: `${name}이 생성되었습니다. 
[바로가기](discord://-/channels/${voiceChannel.guildId}/${voiceChannel.id})`,
        ephemeral: true,
      }),
    );
  }

  @ButtonComponent({ id: /show_voice_channel_invite-.*/ })
  private async showVoiceChannelInvite(
    interaction: Discord.ButtonInteraction<"cached">,
  ) {
    const channel = await RoomMaker.main.getUserVoiceChannel(interaction);
    if (!channel) {
      RoomMaker.main.sendErrorMessage(interaction, "음성방에 입장해 주세요.");
      return null;
    }

    const data = RoomMaker.main.findDataByChannelId(channel.id);
    if (!data) {
      RoomMaker.main.sendErrorMessage(interaction, "등록되지 않은 방입니다.");
      return;
    }

    const channelType = interaction.customId.split("-")[1];
    if (data.name !== channelType) {
      RoomMaker.main.sendErrorMessage(
        interaction,
        `유효하지 않은 방입니다.
${data.name} LFG에서 사용해주세요.`,
      );
      return;
    }

    autoDeleteMessage(
      interaction.reply({ content: inlineCode(channel.url), ephemeral: true }),
    );
    const message = await interaction.channel!.send(
      `${userMention(interaction.user.id)} ${channel.url}`,
    );
    data.messages.get(channel.id)?.push(message);
  }

  @On({ event: "channelDelete" })
  private async onChannelDelete([channel]: DiscordX.ArgsOf<"channelDelete">) {
    if (channel.type !== ChannelType.GuildVoice) return;
    const data = RoomMaker.main.findDataByChannelId(channel.id);
    if (!data) return;

    const messages = data.messages.get(channel.id);
    data.messages.delete(channel.id);
    data.channels.delete(channel);
    if (!messages) return;
    await Promise.all(messages.map((m) => m.delete().catch(() => {})));
  }
}

class RoomData {
  // 생성된 방들
  public readonly channels: Set<Discord.VoiceChannel> = new Set();
  // [방ID]: 초대링크 메시지들
  public readonly messages: Map<Discord.Snowflake, Discord.Message[]> =
    new Map();

  constructor(
    public readonly name: string,
    public readonly channel: Discord.TextChannel,
  ) {}
}
