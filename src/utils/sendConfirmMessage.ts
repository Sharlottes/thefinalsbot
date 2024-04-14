import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import onlyOwner from "./onlyOwner";

export default async function sendConfirmMessage(
  content: string | Discord.EmbedBuilder,
  interaction: Discord.ChatInputCommandInteraction,
  {
    disagreeMessage,
    timeoutMessage,
    removeOnDisagree,
    ...options
  }: {
    disagreeMessage?: string;
    timeoutMessage?: string;
    removeOnDisagree?: boolean;
  } & Omit<
    Discord.InteractionEditReplyOptions & Discord.InteractionReplyOptions,
    "embeds" | "components"
  > = {
    timeoutMessage: "시간이 초과되었습니다.",
    removeOnDisagree: true,
  },
): Promise<boolean | null> {
  const embed =
    typeof content === "string"
      ? new EmbedBuilder({ description: content })
      : content;
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder({
      label: "네",
      style: ButtonStyle.Primary,
      customId: "agree",
    }),
    new ButtonBuilder({
      label: "아니요",
      style: ButtonStyle.Secondary,
      customId: "disagree",
    }),
  );
  const message = await interaction[
    interaction.deferred || interaction.replied ? "editReply" : "reply"
  ]({
    embeds: [embed],
    components: [buttons],
    ...(options as any),
  });
  const res = await message
    .awaitMessageComponent({
      filter: onlyOwner(interaction.user.id),
      componentType: ComponentType.Button,
      time: 10000,
    })
    .then(async (button) => {
      if (button.customId == "agree") {
        return true;
      } else if (button.customId == "disagree") {
        return false;
      }
      return null;
    })
    .catch(() => null);

  if (res === null) {
    await interaction.editReply({
      content: timeoutMessage,
      embeds: [],
      components: [],
    });
    return res;
  } else if (res === false) {
    if (disagreeMessage !== undefined) {
      await interaction.editReply({
        content: disagreeMessage,
        embeds: [],
        components: [],
      });
    } else if (removeOnDisagree) {
      await interaction.deleteReply();
    }
    return res;
  }

  return res;
}
