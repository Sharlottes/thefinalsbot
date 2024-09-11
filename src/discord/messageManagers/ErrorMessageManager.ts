import Discord from "discord.js";
import MessageManager from "./MessageManager";
import PColors from "@/constants/PColors";

export interface ErrorMessageOptions {
  description?: string;
  footer?: [string, string];
}
export default class ErrorMessageManager extends MessageManager<ErrorMessageOptions>() {
  protected static override async createMessageData({ description, footer }: ErrorMessageOptions) {
    const messageData = await super.createMessageData({});
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
}
