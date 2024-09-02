import { InputMessageManager, InputOptions } from "./InputMessageManager";
import { PrimitiveInputType, PrimitiveInputResolver } from "./InputResolvers";
import MessageBuilder from "@/discord/messageManagers/MessageBuilder";
import { MessageData } from "@/discord/messageManagers/MessageManager";

export interface ArrayInputOptions<PT extends PrimitiveInputType>
  extends InputOptions<PT> {
  maxLength?: number;
}

export default class ArrayInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<PT, Array<PT>, ArrayInputOptions<PT>> {
  public static override Builder = MessageBuilder(ArrayInputMessageManager);

  constructor(
    message: Discord.Message,
    messageData: MessageData,
    options: {
      inputResolver: PrimitiveInputResolver<PT>;
      value?: Array<PT>;
    } & ArrayInputOptions<PT>,
  ) {
    super(message, messageData, {
      type: "array",
      value: options.value || [],
      ...options,
    });
    this.value ??= [];
    this.options.valueValidators = options.valueValidators ?? [];
    this.options.valueValidators.push({
      callback: () =>
        this.options.maxLength === undefined ||
        this.value!.length <= this.options.maxLength,
      invalidMessage: `이 목록에는 ${this.options.maxLength}개만 담을 수 있습니다.`,
    });
    this.message.react("👍");
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value!.push(value);
    await this.update();
  }

  public override async update() {
    this.messageData.content = `입력 대기중...
* 입력을 위한 ${this.inputResolver.getTypeString()} 메시지를 보내주세요. 
* 순서대로 메시지를 보내주세요. ${this.options.maxLength === undefined ? "" : `(${this.options.maxLength}개까지 가능)`}
* ${this.inputResolver.getDescription()}
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    return super.update();
  }
}
