import Discord from "discord.js";
import MessageManager from "./MessageManager";
import PColors from "@/constants/PColors";

export default class AlertMessageManager<
  R extends Discord.RepliableInteraction | Discord.Message,
> extends MessageManager<R> {
  public constructor(
    responseObject: R,
    {
      title,
      description,
      footer,
    }: { title?: string; description?: string; footer?: [string, string] },
  ) {
    super(responseObject);
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
}
