import { ActionRow, ActionRowBuilder } from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";

export default <T extends MessageManager, OT = any>(
  Manager: (new (
    message: Discord.Message,
    messageData: MessageData,
    options: OT,
  ) => T) &
    Pick<typeof MessageManager, "presetMessageData">,
) =>
  class MessageBuilder {
    private messageData: MessageData = Object.create(
      MessageBuilder.getEmptyMessageData(),
    );

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
      this.messageData = await Manager.presetMessageData(
        this.messageData,
        options,
        sender,
      );
      const sendOptions = {
        content: this.messageData.content ?? undefined,
        embeds: this.messageData.embeds,
        allowedMentions: this.messageData.allowedMentions,
        files: this.messageData.files,
        components: this.messageData.components,
      };
      const isEmpty = MessageBuilder.isEmpty(this.messageData);
      if (isEmpty) {
        sendOptions.content = "\u200b";
      }
      const message = await (() => {
        if (type === "interaction") {
          const interaction = sender as Discord.RepliableInteraction;
          if (interaction.deferred) {
            return interaction
              .editReply(sendOptions)
              .then((res) => res.fetch());
          } else if (interaction.replied) {
            return interaction.followUp(sendOptions).then((res) => res.fetch());
          } else {
            return interaction.reply(sendOptions).then((res) => res.fetch());
          }
        } else {
          return (sender as Discord.PartialTextBasedChannelFields).send(
            sendOptions,
          );
        }
      })();
      const manager = await new Manager(
        message,
        this.messageData,
        options,
      ).postsetManger();
      if (isEmpty && manager.messageData.content === "wait...") {
        manager.messageData.content = null;
      }

      return manager;
    }

    private static getEmptyMessageData() {
      return {
        content: null,
        embeds: [],
        allowedMentions: {},
        files: [],
        attachments: [],
        components: [],
      };
    }

    private static isEmpty(messageData: MessageData) {
      return (
        !messageData.content &&
        !messageData.embeds.length &&
        !messageData.files.length &&
        !messageData.attachments.length &&
        !messageData.components.length
      );
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
      this.messageData.embeds.splice(index, 1);
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
      this.messageData.files.push(...files);
      return this;
    }

    public removeFile(index: number) {
      this.messageData.files.splice(index, 1);
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

    public addComponent(
      ...components:
        | MessageData["components"]
        | Discord.MessageActionRowComponentBuilder[]
    ) {
      this.messageData.components.push(
        ...(components.map((c) =>
          c instanceof ActionRowBuilder
            ? c
            : new ActionRowBuilder().addComponents(c),
        ) as MessageData["components"]),
      );
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
      this.messageData.components.splice(index, 1);
      return this;
    }

    public clearComponents() {
      this.messageData.components = [];
      return this;
    }
  };
