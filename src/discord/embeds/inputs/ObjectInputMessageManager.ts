import { inlineCode } from "discord.js";
import { InputMessageManager, InputOptions } from "./InputMessageManager";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import MessageBuilder from "@/discord/embeds/MessageBuilder";
import { MessageData } from "@/discord/embeds/MessageManager";

export default class ObjectInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<PT, Record<string, PT>> {
  public static override Builder = MessageBuilder(ObjectInputMessageManager);

  constructor(
    message: Discord.Message,
    messageData: MessageData,
    options: {
      inputResolver: PrimitiveInputResolver<PT>;
      value?: Record<string, PT>;
    } & InputOptions<PT>,
  ) {
    super(message, messageData, {
      type: "object",
      value: options.value || {},
      ...options,
    });
    this.options.textValidators = options.textValidators ?? [];
    this.options.textValidators.push({
      callback: (value) => value.includes(":"),
      invalidMessage: `서식이 올바르지 않습니다. ${inlineCode(":")} 문자가 무조건 있어야 합니다.`,
    });

    this.message.react("👍");
  }

  protected override async setupCollectors() {
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
      this.update();
    });
  }

  protected override async handleValue(message: Discord.Message, value: PT) {}

  public override async update() {
    this.messageData.content = `입력 대기중... 
* "키":"${this.inputResolver.getTypeString()}" 서식에 따라 순서대로 메시지를 보내주세요.
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    super.update();
    return this.message;
  }
}
