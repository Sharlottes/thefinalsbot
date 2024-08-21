import Discord from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import PColors from "@/constants/PColors";
import MessageBuilder from "./MessageBuilder";

export interface ErrorMessageOptions {
  description?: string;
  footer?: [string, string];
}
export default class ErrorMessageManager extends MessageManager {
  public constructor(
    message: Discord.Message,
    messageData: MessageData,
    _options: ErrorMessageOptions,
  ) {
    super(message, messageData);
  }

  public static override presetMessageData(
    messageData: MessageData,
    { description, footer }: ErrorMessageOptions,
  ) {
    messageData.embeds = [
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
    return messageData;
  }

  public static override Builder = MessageBuilder(ErrorMessageManager);
}
