import { inlineCode } from "discord.js";
import { Input, InputOptions } from "./Input";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";

export class TextInput<PT extends PrimitiveInputType> extends Input<PT, PT> {
  constructor(
    channel: Discord.TextBasedChannel,
    inputResolver: PrimitiveInputResolver<PT>,
    options: InputOptions<PT> = {},
  ) {
    super("primitive", channel, inputResolver, options);
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value = value;
    this.updateMessage();
  }

  public async updateMessage() {
    const content = `입력 대기중...
* 입력을 위한 ${this.inputResolver.getTypeString()} 메시지를 보내주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    if (!this.msg) {
      this.msg = await this.channel.send(content);
    } else {
      this.msg.edit(content);
    }
  }

  protected override async awaitCollectors() {
    await new Promise<void>((resolve) => {
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
        this.responsedMessages.push(message);
        this.handleValue(message, value);

        const isConfirmed = await this.askConfirm();
        if (!isConfirmed) return;
        resolve();
      });
    });
  }
}

export interface ArrayInputOptions<PT extends PrimitiveInputType>
  extends InputOptions<PT> {
  maxLength?: number;
}
export class ArrayInput<PT extends PrimitiveInputType> extends Input<
  PT,
  Array<PT>,
  ArrayInputOptions<PT>
> {
  constructor(
    channel: Discord.TextBasedChannel,
    inputResolver: PrimitiveInputResolver<PT>,
    options: ArrayInputOptions<PT> = {},
  ) {
    super("array", channel, inputResolver, options);
    this.options.valueValidators = options.valueValidators ?? [];
    this.value = [];
    this.options.valueValidators.push({
      callback: () =>
        this.options.maxLength === undefined ||
        this.value!.length <= this.options.maxLength,
      invalidMessage: `이 목록에는 ${this.options.maxLength}개만 담을 수 있습니다.`,
    });
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value!.push(value);
    this.updateMessage();
  }

  protected override async updateMessage() {
    const content = `입력 대기중...
* 입력을 위한 ${this.inputResolver.getTypeString()} 메시지를 보내주세요. 
* 순서대로 메시지를 보내주세요. ${this.options.maxLength === undefined ? "" : `(${this.options.maxLength}개까지 가능)`}
* ${this.inputResolver.getDescription()}
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    if (!this.msg) {
      this.msg = await this.channel.send(content);
      await this.msg.react("👍");
    } else {
      this.msg.edit(content);
    }
  }
}

export class ObjectInput<PT extends PrimitiveInputType> extends Input<
  PT,
  Record<string, PT>
> {
  keyTurn = true;

  constructor(
    channel: Discord.TextBasedChannel,
    valueInputResolver: PrimitiveInputResolver<PT>,
    options: InputOptions<PT> = {},
  ) {
    super("object", channel, valueInputResolver, options);
    this.options.textValidators = options.textValidators ?? [];
    this.options.textValidators.push({
      callback: (value) => value.includes(":"),
      invalidMessage: `서식이 올바르지 않습니다. ${inlineCode(":")} 문자가 무조건 있어야 합니다.`,
    });

    this.value = {};
  }

  protected override async awaitCollectors() {
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
        const [key, v] = message.content.split(":");
        message.content = v; // 이거 진짜 맞나
        const value = await this.inputResolver.resolveInput(message);
        if (!value) return;

        const isValueValid = this.valueValidate(value);
        if (!isValueValid) return;
        message.react("✅");
        this.responsedMessages.push(message);
        this.value![key] = value;
        this.updateMessage();
      });
    });
  }

  protected override async handleValue(message: Discord.Message, value: PT) {}

  protected override async updateMessage() {
    const content = `입력 대기중... 
* "키":"${this.inputResolver.getTypeString()}" 서식에 따라 순서대로 메시지를 보내주세요.
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    if (!this.msg) {
      this.msg = await this.channel.send(content);
      await this.msg.react("👍");
    } else {
      this.msg.edit(content);
    }
  }
}
