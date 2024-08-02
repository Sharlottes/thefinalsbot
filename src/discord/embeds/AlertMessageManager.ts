import Discord from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import PColors from "@/constants/PColors";
import MessageBuilder from "./MessageBuilder";

export default class AlertMessageManager extends MessageManager {
  public constructor(
    message: Discord.Message,
    messageData: MessageData,
    {
      title,
      description,
      footer,
    }: { title?: string; description?: string; footer?: [string, string] },
  ) {
    super(message, messageData);
    this.messageData.embeds = [
      new Discord.EmbedBuilder()
        .setColor(PColors.primary)
        .setTitle(title || null)
        .setColor(Discord.Colors.Blue)
        .setDescription(description || null)
        .setFooter(
          footer
            ? {
                text: footer[0],
                iconURL: footer[1],
              }
            : null,
        ),
    ];
  }

  public static override Builder = new MessageBuilder(AlertMessageManager);
}
