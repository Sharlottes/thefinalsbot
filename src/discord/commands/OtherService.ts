import { Slash, Discord } from "discordx";
import { Colors, EmbedBuilder } from "discord.js";
import PColors from "@/constants/PColors";

@Discord()
export default class OtherService {
  @Slash({
    name: "핑",
    description: "봇 핑을 확인 합니다",
  })
  ping(interaction: Discord.ChatInputCommandInteraction) {
    const ping = Date.now() - interaction.createdTimestamp;
    const embed = new EmbedBuilder().setColor(PColors.primary).setTitle("ping: " + ping + "ms");
    interaction.reply({ embeds: [embed] });
  }
}
