import Discord from "discord.js";
import MessageManager from "./MessageManager";
import PColors from "@/constants/PColors";

export default class ErrorMessageManager<
  R extends Discord.RepliableInteraction | Discord.Message,
> extends MessageManager<R> {
  public constructor(
    responseObject: R,
    {
      description,
      footer,
    }: { description?: string; footer?: [string, string] },
  ) {
    super(responseObject);
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
}
