import InputMessageManager, { InputOptions } from "./InputMessageManager";
import { PrimitiveInputResolver, PrimitiveInputType } from "./InputResolvers";
import { MessageData } from "@/discord/messageManagers/MessageManager";

export interface ArrayInputOptions<PT extends PrimitiveInputType> extends InputOptions<PT, "array"> {
  maxLength?: number;
}

export default class ArrayInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<"array">()<PT> {
  protected static override async createManager<PT extends PrimitiveInputType>(
    message: Discord.Message,
    messageData: MessageData,
    options: ArrayInputOptions<PT>,
  ) {
    const manager = new this<PT>(message, messageData, options);

    options.valueValidators = options.valueValidators ?? [];
    options.valueValidators.push({
      callback: () => options.maxLength === undefined || manager.value!.length <= options.maxLength,
      invalidMessage: `이 목록에는 ${options.maxLength}개만 담을 수 있습니다.`,
    });
    manager.value = options.value ?? [];
    manager.inputResolver = options.inputResolver;
    message.react("👍");
    await manager.update();
    await manager.setupCollectors();
    return manager;
  }

  protected static override async createMessageData<PT extends PrimitiveInputType>(
    managerOptions: ArrayInputOptions<PT>,
  ) {
    const messageData = await super.createMessageData(managerOptions);
    messageData.content = `입력 대기중...
* 입력을 위한 ${messageData.inputResolver.getTypeString()} 메시지를 보내주세요. 
* 순서대로 메시지를 보내주세요. ${managerOptions.maxLength === undefined ? "" : `(${managerOptions.maxLength}개까지 가능)`}
* ${messageData.inputResolver.getDescription()}
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString<PT>(messageData.value as PT[], messageData.inputResolver)}`;
    return messageData;
  }

  protected static override getValueString<PT extends PrimitiveInputType>(
    value: PT[] | undefined,
    inputResolver: PrimitiveInputResolver<PT>,
  ): string {
    if (value === undefined) return "없음";
    return value.map((v) => inputResolver.getValueString(v)).join(", ");
  }

  public override getValueString(): string {
    return ArrayInputMessageManager.getValueString(this.value, this.inputResolver);
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value!.push(value);
    await this.update();
  }
}
