import { InputMessageManager, InputOptions } from "./InputMessageManager";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import Vars from "@/Vars";
import MessageBuilder from "@/discord/embeds/MessageBuilder";
import { MessageData } from "@/discord/embeds/MessageManager";

export default class PrimitiveInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<PT, PT | undefined> {
  public static override Builder = MessageBuilder(PrimitiveInputMessageManager);

  constructor(
    message: Discord.Message,
    messageData: MessageData,
    options: {
      inputResolver: PrimitiveInputResolver<PT>;
      value?: PT;
    } & InputOptions<PT>,
  ) {
    super(message, messageData, {
      type: "primitive",
      value: options.value,
      ...options,
    });
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value = value;
    await this.update();
  }

  public override async update() {
    this.messageData.content = `입력 대기중...
* 입력을 위한 ${this.inputResolver.getTypeString()} 메시지를 보내주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    super.update();
    return this.message;
  }

  protected override async setupCollectors() {
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
      this.rCollector.stop();
      this.mCollector.stop();
      this.options.onConfirm?.(value);
      this.remove();
    });
  }
}
