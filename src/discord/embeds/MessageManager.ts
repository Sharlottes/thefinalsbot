import Discord from "discord.js";
import MessageBuilder from "./MessageBuilder";

/**
 * message payload wrapper class
 */
export default class MessageManager {
  public constructor(
    public readonly message: Discord.Message,
    public readonly messageData: MessageData,
  ) {}

  public async update() {
    if (!this.message)
      throw new Error("보내지지 않은 메시지는 업데이트할 수 없습니다!");
    return await this.message.edit({
      content: this.messageData.content,
      embeds: this.messageData.embeds,
      components: this.messageData.components,
      files: this.messageData.files,
      allowedMentions: this.messageData.allowedMentions,
      attachments: this.messageData.attachments,
    });
  }

  public async remove() {
    if (!this.message)
      throw new Error("보내지지 않은 메시지는 삭제할 수 없습니다!");
    return await this.message.delete();
  }

  public static preSetupMessageData(
    messageData: MessageData,
    _options: any,
    sender:
      | Discord.PartialTextBasedChannelFields
      | Discord.RepliableInteraction,
  ) {
    return messageData;
  }

  public static Builder = MessageBuilder(MessageManager);
}

export interface MessageData {
  content: Discord.BaseMessageOptions["content"] | null;
  embeds: Discord.EmbedBuilder[];
  allowedMentions: NonNullable<Discord.BaseMessageOptions["allowedMentions"]>;
  files: NonNullable<Discord.BaseMessageOptions["files"]>;
  attachments: Discord.Attachment[];
  components: Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>[];
}
