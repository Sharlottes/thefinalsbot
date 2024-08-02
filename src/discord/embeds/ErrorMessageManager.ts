import Discord from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import PColors from "@/constants/PColors";
import MessageBuilder from "./MessageBuilder";

export default class ErrorMessageManager extends MessageManager {
  public constructor(
    message: Discord.Message,
    messageData: MessageData,
    { description, footer }: { description: string; footer?: [string, string] },
  ) {
    super(message, messageData);
    this.messageData.embeds = [
      new Discord.EmbedBuilder()
        .setColor(PColors.error)
        .setTitle("이런!")
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

  public static override Builder = new MessageBuilder(ErrorMessageManager);
}
