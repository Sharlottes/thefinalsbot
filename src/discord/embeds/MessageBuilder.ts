import MessageManager, { MessageData } from "./MessageManager";

const emptyMessageData: MessageData = {
  content: null,
  embeds: [],
  allowedMentions: {},
  files: [],
  attachments: [],
  components: [],
};

export default class MessageBuilder<T extends MessageManager, OT = any> {
  private messageData: MessageData = Object.create(emptyMessageData);
  constructor(
    private readonly Manager: new (
      message: Discord.Message,
      messageData: MessageData,
      options: OT,
    ) => T,
  ) {}

  public send(
    type: "channel",
    sender: Discord.PartialTextBasedChannelFields,
    options: OT,
  ): Promise<T>;
  public send(
    type: "interaction",
    sender: Discord.RepliableInteraction,
    options: OT,
  ): Promise<T>;
  public async send(
    type: "channel" | "interaction",
    sender:
      | Discord.PartialTextBasedChannelFields
      | Discord.RepliableInteraction,
    options: OT,
  ) {
    const sendOptions = {
      content: this.messageData.content ?? undefined,
      embeds: this.messageData.embeds,
      allowedMentions: this.messageData.allowedMentions,
      files: this.messageData.files,
      components: this.messageData.components,
    };
    const message = await (() => {
      if (type === "interaction") {
        return (sender as Discord.RepliableInteraction)
          .reply(sendOptions)
          .then((res) => res.fetch());
      } else {
        return (sender as Discord.PartialTextBasedChannelFields).send(
          sendOptions,
        );
      }
    })();
    return new this.Manager(message, this.messageData, options);
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
}
