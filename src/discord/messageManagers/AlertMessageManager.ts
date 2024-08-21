import Discord from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import PColors from "@/constants/PColors";
import MessageBuilder from "./MessageBuilder";

export interface AlertMessageOptions {
  title?: string;
  description?: string;
  footer?: [string, string];
}
export default class AlertMessageManager extends MessageManager {
  public constructor(
    message: Discord.Message,
    messageData: MessageData,
    _options: AlertMessageOptions,
  ) {
    super(message, messageData);
  }

  public static override presetMessageData(
    messageData: MessageData,
    { title, description, footer }: AlertMessageOptions,
  ) {
    messageData.embeds = [
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
    return messageData;
  }

  public static override Builder = MessageBuilder(AlertMessageManager);
}
