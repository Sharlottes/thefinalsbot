import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
} from "discord.js";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import MessageManager, {
  MessageData,
} from "@/discord/messageManagers/MessageManager";

export interface InputOptions<
  PT extends PrimitiveInputType,
  T extends PTTypes,
> {
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
type ResolvePT<
  PT extends PrimitiveInputType,
  T extends PTTypes,
> = T extends "primitive" ? PT : T extends "array" ? PT[] : Record<string, PT>;

export default function InputMessageManager<T extends PTTypes>() {
  return class InputMessageManager<
    PT extends PrimitiveInputType,
  > extends MessageManager<InputOptions<any, T>>() {
    public value!: ResolvePT<PT, T>;
    protected rCollector!: Discord.ReactionCollector;
    protected mCollector!: Discord.MessageCollector;
    protected responsedMessages: Discord.Message[] = [];
    protected inputResolver!: PrimitiveInputResolver<PT>;

    public declare static createOnChannel: <PT extends PrimitiveInputType>(
      sender: Parameters<
        ReturnType<typeof MessageManager>["createOnChannel"]
      >[0],
      managerOptions: InputOptions<PT, T>,
      options?: Omit<Discord.MessageCreateOptions, keyof MessageData>,
      >[2],
    ) => Promise<InputMessageManager<PT>>;

    public declare static createOnInteraction: <PT extends PrimitiveInputType>(
      sender: Discord.RepliableInteraction,
      sender: Parameters<
        ReturnType<typeof MessageManager>["createOnInteraction"]
      >[0],
      managerOptions: InputOptions<PT, T>,
      options?: Omit<Discord.InteractionReplyOptions, keyof MessageData>,
      >[2],
    ) => Promise<InputMessageManager<PT>>;

    protected static override async createMessageData<
      PT extends PrimitiveInputType,
    >(managerOptions: InputOptions<PT, T>): Promise<any> {
      return super.createMessageData(managerOptions);
    }

    protected static getValueString<PT extends PrimitiveInputType>(
      value: ResolvePT<PT, T>,
      inputResolver: PrimitiveInputResolver<PT>,
    ): string {
      return "없음";
    }

    protected static override async createManager<
      PT extends PrimitiveInputType,
    >(
      message: Discord.Message,
      messageData: MessageData,
      options: InputOptions<PT, T>,
    ) {
      const manager = new this<PT>(message, messageData, options);
      throw new Error("Not implemented");
      return manager;
    }

    public override async remove() {
      await Promise.all([
        this.message.delete(),
        ...this.responsedMessages.map((m) => m.delete()),
      ]);
    }

    protected async handleValue(
      message: Discord.Message,
      value: PT,
    ): Promise<void> {}

    protected setupCollectors() {
      return new Promise<void>((res) => {
        this.rCollector.on("collect", async (reaction) => {
          if (reaction.emoji.name !== "👍" || reaction.count == 1) return;
          if (!this.value) {
            autoDeleteMessage(
              this.message.channel.send("에러: 입력된 값이 없습니다."),
              1500,
            );
            return;
          }
          const isConfirmed = await this.askConfirm();
          if (!isConfirmed) return;
          this.rCollector.stop();
          this.mCollector.stop();
          this.options.onConfirm?.(this.value);
          this.remove();
          res();
        });
        this.mCollector.on("collect", async (message) => {
          if (message.author.id == Vars.client.user!.id) return;
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
      });
    }

    protected async askConfirm(): Promise<boolean> {
      const msg = await this.message.channel.send({
        content: `입력 완료: ${this.getValueString()}로 확정할까요?`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("input_yes")
              .setLabel("예")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("input_no")
              .setLabel("아니요")
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
      const interaction = await msg.awaitMessageComponent();
      if (interaction.customId == "input_yes") {
        await Promise.all([
          autoDeleteMessage(interaction.reply("입력이 완료되었습니다."), 1500),
          msg.delete(),
        ]);
        return true;
      } else {
        await Promise.all([
          autoDeleteMessage(interaction.reply("입력이 취소되었습니다."), 1500),
          msg.delete(),
        ]);
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
            embeds: [
              new EmbedBuilder()
                .setTitle("입력 오류")
                .setDescription(errmsg)
                .setColor(Colors.Red),
            ],
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
