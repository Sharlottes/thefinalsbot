import Discord from "discord.js";
import MessageManager from "./MessageManager";
import PColors from "@/constants/PColors";

export interface AlertMessageOptions {
  title?: string;
  description?: string;
  footer?: [string, string];
}
export default class AlertMessageManager extends MessageManager<AlertMessageOptions>() {
  public static override async createMessageData({ title, description, footer }: AlertMessageOptions) {
    const messageData = await super.createMessageData({});
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
}
