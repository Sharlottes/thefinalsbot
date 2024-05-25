import Discord from "discord.js";

/**
 * message payload wrapper class
 */
export default class MessageManager<
  R extends Discord.RepliableInteraction | Discord.Message = Discord.Message,
> {
  private static readonly emptyMessageData: MessageData = {
    content: null,
    embeds: [],
    allowedMentions: {},
    files: [],
    attachments: [],
    components: [],
  };
  private readonly messageSender: MessageSender<R>;
  public messageData: MessageData = Object.create(
    MessageManager.emptyMessageData,
  );

  public constructor(responseObject: R) {
    this.messageSender = new MessageSender(responseObject);
  }

  public with(func: (_this: this) => void): this {
    func(this);
    return this;
  }

  public async send(
    options?: Parameters<(typeof this.messageSender)["send"]>[1],
  ) {
    return await this.messageSender.send(this.messageData, options);
  }

  public async update() {
    return await this.messageSender.update(this.messageData);
  }

  public setContent(content: typeof this.messageData.content) {
    this.messageData.content = content;
    return this;
  }

  public setEmbeds(embeds: Discord.EmbedBuilder[]) {
    this.messageData.embeds = embeds;
    return this;
  }

  public addEmbeds(...embeds: Discord.EmbedBuilder[]) {
    if (!this.messageData.embeds) this.messageData.embeds = [];
    this.messageData.embeds.push(...embeds);
    return this;
  }

  public configEmbed(
    index: number,
    func: (_this: MessageData["embeds"][number]) => void,
  ) {
    if (this.messageData.embeds[index]) func(this.messageData.embeds[index]);
    return this;
  }

  public removeEmbed(index: number) {
    if (this.messageData.embeds) this.messageData.embeds.splice(index, 1);
    return this;
  }

  public clearEmbeds() {
    this.messageData.embeds = [];
    return this;
  }

  public setAllowedMentions<K extends keyof MessageData["allowedMentions"]>(
    target: K,
    allowedMentions: MessageData["allowedMentions"][K],
  ) {
    this.messageData.allowedMentions[target] = allowedMentions;
    return this;
  }

  public addAllowedMentions<
    K extends Exclude<keyof MessageData["allowedMentions"], "repliedUser">,
    V extends MessageData["allowedMentions"][K] extends any[]
      ? MessageData["allowedMentions"][K][number]
      : never,
  >(target: K, ...allowedMentions: V[]) {
    if (!this.messageData.allowedMentions)
      this.messageData.allowedMentions = {};
    if (!this.messageData.allowedMentions[target]) {
      this.messageData.allowedMentions[target] = [] as V[];
    }
    this.messageData.allowedMentions[target]!.push(...allowedMentions);
    return this;
  }

  public setFiles(files: MessageData["files"]) {
    this.messageData.files = files;
    return this;
  }

  public addFile(...files: MessageData["files"]) {
    if (!this.messageData.files) this.messageData.files = [];
    this.messageData.files.push(...files);
    return this;
  }

  public removeFile(index: number) {
    if (this.messageData.files) this.messageData.files.splice(index, 1);
    return this;
  }

  public configFile(
    index: number,
    func: (_this: MessageData["files"][number]) => void,
  ) {
    if (this.messageData.files[index]) func(this.messageData.files[index]);
    return this;
  }

  public clearFiles() {
    this.messageData.files = [];
    return this;
  }

  public setAttachments(attachments: MessageData["attachments"]) {
    this.messageData.attachments = attachments;
    return this;
  }

  public addAttachment(...attachments: MessageData["attachments"]) {
    if (!this.messageData.attachments) this.messageData.attachments = [];
    this.messageData.attachments.push(...attachments);
    return this;
  }

  public configAttachment(
    index: number,
    func: (_this: MessageData["attachments"][number]) => void,
  ) {
    if (this.messageData.attachments[index])
      func(this.messageData.attachments[index]);
    return this;
  }

  public removeAttachment(index: number) {
    if (this.messageData.attachments)
      this.messageData.attachments.splice(index, 1);
    return this;
  }

  public clearAttachments() {
    this.messageData.attachments = [];
    return this;
  }

  public setComponents(components: MessageData["components"]) {
    this.messageData.components = components;
    return this;
  }

  public addComponent(...components: MessageData["components"]) {
    if (!this.messageData.components) this.messageData.components = [];
    this.messageData.components.push(...components);
    return this;
  }

  public configComponent(
    index: number,
    func: (_this: MessageData["components"][number]) => void,
  ) {
    if (this.messageData.components[index])
      func(this.messageData.components[index]);
    return this;
  }

  public removeComponent(index: number) {
    if (this.messageData.components)
      this.messageData.components.splice(index, 1);
    return this;
  }

  public clearComponents() {
    this.messageData.components = [];
    return this;
  }

  public clear() {
    this.messageData = Object.create(MessageManager.emptyMessageData);
    return this;
  }
}

interface MessageData {
  content: Discord.MessageEditOptions["content"];
  embeds: Discord.EmbedBuilder[];
  allowedMentions: NonNullable<Discord.MessageEditOptions["allowedMentions"]>;
  files: NonNullable<Discord.MessageEditOptions["files"]>;
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

class MessageSender<
  ResponseObject extends Discord.RepliableInteraction | Discord.Message,
> {
  constructor(private object: ResponseObject) {}

  public async send(
    messageData: MessageData,
    options?: typeof this.object extends Discord.BaseInteraction
      ? Exclude<Discord.InteractionReplyOptions, keyof typeof messageData>
      : Exclude<Discord.MessageCreateOptions, keyof typeof messageData>,
  ) {
    if (this.object instanceof Discord.BaseInteraction) {
      return await this.object.reply({
        content: messageData.content ?? undefined,
        embeds: messageData.embeds,
        allowedMentions: messageData.allowedMentions,
        files: messageData.files,
        components: messageData.components,
        ...(options as Exclude<
          Discord.InteractionReplyOptions,
          keyof typeof messageData
        >),
      });
    } else if (this.object instanceof Discord.Message) {
      return await this.object.channel.send({
        content: messageData.content ?? undefined,
        embeds: messageData.embeds,
        allowedMentions: messageData.allowedMentions,
        files: messageData.files,
        components: messageData.components,
        ...(options as Exclude<
          Discord.MessageCreateOptions,
          keyof typeof messageData
        >),
      });
    }

    throw new Error("No interaction or message");
  }

  public async update<
    Func extends ResponseObject extends Discord.RepliableInteraction
      ? ResponseObject["editReply"]
      : ResponseObject extends Discord.Message
        ? ResponseObject["edit"]
        : () => Promise<"Invalid Response Object">,
  >(param: Parameters<Func>[0]): Promise<ReturnType<Func>> {
    if (this.object instanceof Discord.BaseInteraction) {
      return (await this.object.editReply(param)) as ReturnType<Func>;
    }
    if (this.object instanceof Discord.Message) {
      return (await this.object.edit(param)) as ReturnType<Func>;
    }

    throw new Error("No interaction or message");
  }
}
