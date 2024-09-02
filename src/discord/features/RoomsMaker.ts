import FixedMessageRegister from "@/core/FixedMessageRegister";
import Vars from "@/Vars";
import VoiceChannelManager from "@/core/VoiceChannelManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import PColors from "@/constants/PColors";

@Discord()
export default class RoomsMaker {
  public static main: RoomsMaker;

  constructor() {
    RoomsMaker.main = this;
  }

  public async init(): Promise<void> {
    console.time("initalizing RoomsMaker...");
    await Promise.all(
      Object.entries(Vars.roomMakingAnnounceData).map(
        ([channelId, { channel, name, description }]) =>
          FixedMessageRegister.sendMessage(
            channel,
            this.buildChannelMessage(name, description),
            "keep",
          ),
      ),
    );
    console.timeEnd("initalizing RoomsMaker...");
  }

  private buildChannelMessage(name: string, description: string) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle(name + " 음성방 생성")
          .setDescription(
            `${description}
음성방을 생성하려면 아래 버튼을 눌러주세요.`,
          )
          .setFooter({ text: "THE FINALS TEAMS" }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("create_voice_channel")
            .setLabel(name + " 음성방 생성")
            .setStyle(ButtonStyle.Primary),
        ),
      ],
    };
  }

  @ButtonComponent({ id: "create_voice_channel" })
  private async onButtonClick(interaction: Discord.ButtonInteraction) {
    const name =
      ((
        interaction.message.components[0]
          .components[0] as Discord.ButtonComponent
      ).label?.split(/\s/)[0] || "") + " 대화방";
    const voiceChannel = await VoiceChannelManager.createVoiceChannel(name, {
      owner: interaction.user,
    });
    await autoDeleteMessage(
      interaction.reply({
        content: `${name}이 생성되었습니다. 
[바로가기](discord://-/channels/${voiceChannel.guildId}/${voiceChannel.id})`,
        ephemeral: true,
      }),
    );
  }
}
