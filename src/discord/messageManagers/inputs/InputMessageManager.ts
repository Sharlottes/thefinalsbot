import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, ComponentType, EmbedBuilder } from "discord.js";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import MessageManager, { MessageData } from "@/discord/messageManagers/MessageManager";

export interface InputOptions<PT extends PrimitiveInputType, T extends PTTypes> {
  // * for each text input
  textValidators?: {
    callback: (value: string) => boolean;
    invalidMessage: string;
  }[];
  // * for each resolved value
  valueValidators?: {
    callback: (value: PT) => boolean;
    invalidMessage: string;
  }[];
  inputResolver: PrimitiveInputResolver<PT>;
  onConfirm?: (value: ResolvePT<PT, T>) => void;
  value?: ResolvePT<PT, T>;
}

export type PTTypes = "primitive" | "array" | "object";
type ResolvePT<PT extends PrimitiveInputType, T extends PTTypes> = T extends "primitive"
  ? PT
  : T extends "array"
    ? PT[]
    : Record<string, PT>;

export default function InputMessageManager<T extends PTTypes>() {
  return class InputMessageManager<PT extends PrimitiveInputType> extends MessageManager<InputOptions<any, T>>() {
    public value?: ResolvePT<PT, T>;
    protected rCollector!: Discord.ReactionCollector;
    protected mCollector!: Discord.MessageCollector;
    protected cCollector!: Discord.InteractionCollector<Discord.ButtonInteraction>;
    protected responsedMessages: Discord.Message[] = [];
    protected inputResolver!: PrimitiveInputResolver<PT>;

    public declare static createOnChannel: <PT extends PrimitiveInputType>(
      sender: Parameters<ReturnType<typeof MessageManager>["createOnChannel"]>[0],
      managerOptions: InputOptions<PT, T>,
      options?: Parameters<ReturnType<typeof MessageManager>["createOnChannel"]>[2],
    ) => Promise<InputMessageManager<PT>>;

    public declare static createOnInteraction: <PT extends PrimitiveInputType>(
      sender: Parameters<ReturnType<typeof MessageManager>["createOnInteraction"]>[0],
      managerOptions: InputOptions<PT, T>,
      options?: Parameters<ReturnType<typeof MessageManager>["createOnInteraction"]>[2],
    ) => Promise<InputMessageManager<PT>>;

    protected static override async createMessageData<PT extends PrimitiveInputType>(
      managerOptions: InputOptions<PT, T>,
    ) {
      const messageData = await super.createMessageData(managerOptions);
      messageData.components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("취소").setStyle(ButtonStyle.Danger).setCustomId("inputmessagemanager-cancel"),
        ),
      ];
      return messageData;
    }

    protected static getValueString<PT extends PrimitiveInputType>(
      value: ResolvePT<PT, T>,
      inputResolver: PrimitiveInputResolver<PT>,
    ): string {
      return "없음";
    }

    protected static override async createManager<PT extends PrimitiveInputType>(
      message: Discord.Message,
      messageData: MessageData,
      options: InputOptions<PT, T>,
    ): Promise<InputMessageManager<PT>> {
      const manager = new this<PT>(message, messageData, options);
      throw new Error("Not implemented");
      return manager;
    }

    public override async remove() {
      await Promise.all([this.message.delete(), ...this.responsedMessages.map((m) => m.delete())]);
    }

    public async end() {
      this.rCollector.stop();
      this.mCollector.stop();
      this.remove();
    }

    protected async handleValue(message: Discord.Message, value: PT): Promise<void> {}

    protected setupCollectors() {
      this.rCollector = this.message.createReactionCollector({
        filter: (reaction) => reaction.emoji.name === "👍" && reaction.count > 1,
      });
      this.mCollector = this.message.channel.createMessageCollector({
        filter: (message) => message.author.id !== Vars.client.user!.id,
      });
      this.cCollector = this.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
      });
      return new Promise<void>((res) => {
        this.rCollector.on("collect", async () => {
          if (!this.value) {
            autoDeleteMessage(this.message.channel.send("에러: 입력된 값이 없습니다."), 1500);
            return;
          }
          const isConfirmed = await this.askConfirm();
          if (!isConfirmed) return;
          this.options.onConfirm?.(this.value);
          await this.end();
          res();
        });
        this.mCollector.on("collect", async (message) => {
          this.responsedMessages.push(message);
          const isTextValid = this.textValidate(message.content);
          if (!isTextValid) return;
          const value = await this.inputResolver.resolveInput(message);
          if (!value) return;

          const isValueValid = this.valueValidate(value);
          if (!isValueValid) return;
          message.react("✅");
          this.handleValue(message, value);
        });
        this.cCollector.on("collect", async (interaction) => {
          autoDeleteMessage(interaction.reply({ content: "취소되었습니다.", ephemeral: true }));
          this.end();
          res();
        });
      });
    }

    protected async askConfirm(): Promise<boolean> {
      const msg = await this.message.channel.send({
        content: `입력 완료: ${this.getValueString()}로 확정할까요?`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("input_yes").setLabel("예").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("input_no").setLabel("아니요").setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
      const interaction = await msg.awaitMessageComponent();
      if (interaction.customId == "input_yes") {
        await Promise.all([autoDeleteMessage(interaction.reply("입력이 완료되었습니다."), 1500), msg.delete()]);
        return true;
      } else {
        await Promise.all([autoDeleteMessage(interaction.reply("입력이 취소되었습니다."), 1500), msg.delete()]);
        return false;
      }
    }

    public getValueString(): string {
      throw new Error("Invalid type");
    }

    protected textValidate(str: string): boolean {
      if (!this.options.textValidators) return true;

      let errmsg = "";
      for (const validator of this.options.textValidators) {
        if (validator.callback(str)) continue;
        errmsg += `* ${validator.invalidMessage}\n`;
      }
      if (errmsg) {
        autoDeleteMessage(
          this.message.channel.send({
            embeds: [new EmbedBuilder().setTitle("입력 오류").setDescription(errmsg).setColor(Colors.Red)],
          }),
        );
        return false;
      }
      return true;
    }

    protected valueValidate(v: PT): v is NonNullable<PT> {
      if (!this.options.valueValidators) return true;

      let errmsg = "";
      for (const validator of this.options.valueValidators) {
        if (validator.callback(v)) continue;
        errmsg += `* ${validator.invalidMessage}\n`;
      }
      if (errmsg) {
        autoDeleteMessage(this.message.channel.send(errmsg));
        return false;
      }
      return true;
    }
  };
}
