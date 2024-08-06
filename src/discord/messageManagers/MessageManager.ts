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
      allowedMentions: this.messageData.allowedMentions,
      files: this.messageData.files,
      // ! 생략 시 전체 유지 -> 기존 파일이 this.messageData.files로 "변경"되는게 아니라 "추가"됨. 이를 방지하기 위해 undefined로 설정
      attachments:
        this.messageData.attachments.length > 0
          ? this.messageData.attachments
          : undefined,
    });
  }

  public async remove() {
    if (!this.message)
      throw new Error("보내지지 않은 메시지는 삭제할 수 없습니다!");
    await this.message.delete();
  }

  /**
   * MessageManger 생성 전 messageData에 대한 설정이 필요할 때 사용
   */
  public static presetMessageData(
    messageData: MessageData,
    _options: any,
    sender:
      | Discord.PartialTextBasedChannelFields
      | Discord.RepliableInteraction,
  ): MaybePromise<MessageData> {
    return messageData;
  }

  /**
   * MessageManager 생성 후 비동기적인 작업이 필요할 때 사용
   */
  public postsetManger(): MaybePromise<MessageManager> {
    return this;
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
