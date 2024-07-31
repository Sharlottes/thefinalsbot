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

export interface InputOptions<PT extends PrimitiveInputType> {
  // * for each text input
  textValidators?: {
    callback: (value: string) => boolean;
    invalidMessage: string;
  }[];
  // * for each resolved value
  valueValidators?: {
    callback: (value: PT | null | undefined) => boolean;
    invalidMessage: string;
  }[];
}
export abstract class Input<
  PT extends PrimitiveInputType,
  T extends PT | Array<PT> | Record<string, PT>,
  OT extends InputOptions<PT> = InputOptions<PT>,
> {
  public value!: T;
  protected msg!: Discord.Message;
  protected rCollector!: Discord.ReactionCollector;
  protected mCollector!: Discord.MessageCollector;
  // * for cleanup messages
  protected readonly responsedMessages: Discord.Message[] = [];

  constructor(
    protected readonly type: "primitive" | "array" | "object",
    protected readonly channel: Discord.TextBasedChannel,
    protected readonly inputResolver: PrimitiveInputResolver<PT>,
    protected readonly options: OT,
  ) {}

  protected abstract updateMessage(): Promise<void>;
  protected abstract handleValue(
    message: Discord.Message,
    value: PT,
  ): Promise<void>;

  public async start() {
    await this.updateMessage();
    this.rCollector = this.msg.createReactionCollector();
    this.mCollector = this.channel.createMessageCollector();
    await this.awaitCollectors();
    this.rCollector.stop();
    this.mCollector.stop();
    await Promise.all([
      this.msg.delete(),
      ...this.responsedMessages.map((m) => m.delete()),
    ]);

    return this.value!;
  }

  protected async awaitCollectors() {
    await new Promise<void>((resolve) => {
      this.rCollector.on("collect", async (reaction) => {
        if (reaction.emoji.name !== "👍" || reaction.count == 1) return;
        if (!this.value) {
          autoDeleteMessage(
            this.channel.send("에러: 입력된 값이 없습니다."),
            1500,
          );
          return;
        }
        const isConfirmed = await this.askConfirm();
        if (!isConfirmed) return;
        resolve();
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
    const msg = await this.channel.send({
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
    if (this.value === undefined) return "없음";

    switch (this.type) {
      case "primitive":
        return this.inputResolver.getValueString(this.value as PT);
      case "array":
        return (this.value as PT[])
          .map((v) => this.inputResolver.getValueString(v))
          .join(", ");
      case "object":
        return Object.entries(this.value)
          .map(
            ([key, value]) =>
              `${key}: ${this.inputResolver.getValueString(value)}`,
          )
          .join("\n");
      default:
    }
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
        this.channel.send({
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

  protected valueValidate(v: PT | null | undefined): v is NonNullable<PT> {
    if (!this.options.valueValidators) return true;

    let errmsg = "";
    for (const validator of this.options.valueValidators) {
      if (validator.callback(v)) continue;
      errmsg += `* ${validator.invalidMessage}\n`;
    }
    if (errmsg) {
      autoDeleteMessage(this.channel.send(errmsg));
      return false;
    }
    return true;
  }
}
