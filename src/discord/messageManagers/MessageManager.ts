/**
 * 특수 메시지 기능의 베이스 클래스
 * @example
 * ```
 * MessageManager.createOnChannel(interaction.channel, {});
 * MessageManager.createOnInteraction(interaction, {}, { ephermal: true });
 * ```
 * ------
 * ### 파생 클래스 구현 안내
 * - 메시지의 내용물을 변경하려면 `creteMessageData`를 override하세요.
 * - 매니저를 생성하고 나서 처리가 필요하면 `createManager`를 override하세요.
 * - 매니저의 메시지를 변경하고 디스코드에 "렌더"하려면 **무조건 `update`를 사용**하세요.
 * 절대 다른 방법으로 업데이트하지 마십시오. `messageData`와의 무결성이 깨집니다.
 */
export default function MessageManager<OT = unknown>() {
  return class MessageManager {
    constructor(
      public readonly message: Discord.Message,
      public messageData: MessageData = Object.create(emptyMessageData),
      public readonly options: OT,
    ) {}

    protected static async createManager(
      message: Discord.Message,
      messageData: MessageData,
      options: OT,
    ) {
      return new this(message, messageData, options);
    }

    public static async createOnChannel<T extends typeof MessageManager>(
      this: T,
      sender: Discord.PartialTextBasedChannelFields,
      managerOptions: OT,
      options?: Omit<Discord.MessageCreateOptions, keyof MessageData>,
    ): Promise<InstanceType<typeof MessageManager>> {
      const messageData = Object.assign(
        await this.createMessageData(managerOptions),
        options,
      );
      const isEmpty = this.isDataEmpty(messageData);
      if (isEmpty) {
        messageData.content = "\u200b";
      }
      const message = await sender.send(messageData);
      return this.createManager(message, messageData, managerOptions);
    }

    public static async createOnInteraction<T extends typeof MessageManager>(
      this: T,
      sender: Discord.RepliableInteraction,
      managerOptions: OT,
      options?: Omit<Discord.InteractionReplyOptions, keyof MessageData>,
    ): Promise<InstanceType<typeof MessageManager>> {
      const messageData = Object.assign(
        await this.createMessageData(managerOptions),
        options,
      );
      const isEmpty = this.isDataEmpty(messageData);
      if (isEmpty) {
        messageData.content = "\u200b";
      }
      const message = await (() => {
        if (sender.deferred) {
          return sender.editReply(messageData);
        } else if (sender.replied) {
          return sender.followUp(messageData);
        } else {
          return sender.reply({ ...messageData, fetchReply: true });
        }
      })();
      return this.createManager(
        message,
        messageData,
        managerOptions,
      ) as InstanceType<T>;
    }

    protected static async createMessageData(managerOptions: OT) {
      return Object.create(emptyMessageData);
    }

    protected static isDataEmpty(messageData: MessageData) {
      return (
        !messageData.content &&
        !messageData.embeds.length &&
        !messageData.files.length &&
        !messageData.attachments.length &&
        !messageData.components.length
      );
    }

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
  };
}

export interface MessageData {
  content: Discord.BaseMessageOptions["content"] | undefined;
  embeds: Discord.EmbedBuilder[];
  allowedMentions: NonNullable<Discord.BaseMessageOptions["allowedMentions"]>;
  files: NonNullable<Discord.BaseMessageOptions["files"]>;
  attachments: Discord.Attachment[];
  components: Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>[];
}
const emptyMessageData = {
  content: null,
  embeds: [],
  allowedMentions: {},
  files: [],
  attachments: [],
  components: [],
};
