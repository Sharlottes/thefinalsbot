import FixedMessageRegister from "@/core/FixedMessageRegister";
import Vars from "@/Vars";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import PColors from "@/constants/PColors";
import ErrorMessageManager from "../../messageManagers/ErrorMessageManager";
import RoomData from "./RoomData";

export default class RoomsMakerService {
  public static readonly main = new this();
  public readonly data: RoomData[] = [];

  public async init(): Promise<void> {
    console.time("initalisMaker...");
    // clean up fixed message
    while (this.data.length > 0) {
      const data = this.data.pop();
      if (!data) continue;
      FixedMessageRegister.cancelMessage(data.channel);
    }

    await Promise.all(
      Object.entries(Vars.roomMakingAnnounceData).map(async ([channelId, { channel, name, description }]) => {
        this.data.push(new RoomData(name, channel));
        await FixedMessageRegister.sendMessage(channel, RoomsMakerService.buildChannelMessage(name, description));
      }),
    );
    console.timeEnd("initalisMaker...");
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
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("change_voice_channel-" + name)
            .setLabel("음성방 수정하기")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  public async getUserVoiceChannel(interaction: Discord.ButtonInteraction<"cached"> | Discord.ModalSubmitInteraction) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
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

  public sendErrorMessage(interaction: Discord.RepliableInteraction, content: string) {
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
