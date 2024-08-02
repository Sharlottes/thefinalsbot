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
      throw new Error("보내지지 않은 메시지는 업데이트할 수는 없습니다!");
    return await this.message.edit(this.messageData);
  }

  public async remove() {
    if (!this.message)
      throw new Error("보내지지 않은 메시지는 삭제할 수 없습니다!");
    return await this.message.delete();
  }

  public static Builder = new MessageBuilder(MessageManager);
}

export interface MessageData {
  content: Discord.BaseMessageOptions["content"] | null;
  embeds: Discord.EmbedBuilder[];
  allowedMentions: NonNullable<Discord.BaseMessageOptions["allowedMentions"]>;
  files: NonNullable<Discord.BaseMessageOptions["files"]>;
  attachments: Discord.Attachment[];
  components: (
    | Discord.ActionRowBuilder<Discord.ButtonBuilder>
    | Discord.ActionRowBuilder<Discord.ChannelSelectMenuBuilder>
    | Discord.ActionRowBuilder<Discord.MentionableSelectMenuBuilder>
    | Discord.ActionRowBuilder<Discord.RoleSelectMenuBuilder>
    | Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>
    | Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>
  )[];
}
