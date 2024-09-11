import { Slash, Discord, MetadataStorage } from "discordx";
import { EmbedBuilder, inlineCode } from "discord.js";
import PColors from "@/constants/PColors";

@Discord()
export default class HelpService {
  @Slash({
    name: "도움",
    description: "도움말을 확인합니다",
  })
  help(interaction: Discord.ChatInputCommandInteraction) {
    const fields = MetadataStorage.instance.applicationCommandSlashesFlat
      .map(
        (command) =>
          inlineCode(
            `/${command.group ? command.group + " " : ""}${command.subgroup ? command.subgroup + " " : ""}` +
              `${command.name} ${command.options?.map((option) => (option.required ? `(${option.name})` : `[${option.name}]`)).join(" ")}`,
          ) +
          `\n> ${command.description}` +
          (command.subgroup ? "\n" : "\n\n"),
      )
      .join("");

    const embed = new EmbedBuilder().setColor(PColors.primary).setTitle("명령어").setDescription(fields);

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
