import { ComponentType } from "discord.js";
import InputMessageManager, { InputOptions } from "./InputMessageManager";
import { PrimitiveInputResolver, PrimitiveInputType } from "./InputResolvers";
import Vars from "@/Vars";
import { MessageData } from "@/discord/messageManagers/MessageManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";

export default class PrimitiveInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<"primitive">()<PT> {
  protected static override async createManager<PT extends PrimitiveInputType>(
    message: Discord.Message,
    messageData: MessageData,
    options: InputOptions<PT, "primitive">,
  ) {
    const manager = new this<PT>(message, messageData, options);

    options.textValidators = options.textValidators ?? [];
    options.textValidators.push(options.inputResolver.getValidate());
    manager.value = options.value!;
    manager.inputResolver = options.inputResolver;
    await manager.update();
    await manager.setupCollectors();
    return manager;
  }

  protected static override async createMessageData<
    PT extends PrimitiveInputType,
  >(managerOptions: InputOptions<PT, "primitive">): Promise<any> {
    const messageData = await super.createMessageData(managerOptions);
    messageData.content = `입력 대기중...
* 입력을 위한 ${managerOptions.inputResolver.getTypeString()} 메시지를 보내주세요.
* 현재 입력된 값: ${this.getValueString<PT>(managerOptions.value, managerOptions.inputResolver)}`;
    return messageData;
  }

  protected static override getValueString<PT extends PrimitiveInputType>(
    value: PT | undefined,
    inputResolver: PrimitiveInputResolver<PT>,
  ): string {
    if (value === undefined) return "없음";
    return inputResolver.getValueString(value);
  }

  public override getValueString(): string {
    return PrimitiveInputMessageManager.getValueString(
      this.value,
      this.inputResolver,
    );
  }

  protected override async handleValue(message: Discord.Message, value: PT) {
    this.value = value;
    await this.update();
  }

  protected override async setupCollectors() {
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

        const isConfirmed = await this.askConfirm();
        if (!isConfirmed) return;
        this.options.onConfirm?.(this.value);
        await this.end();
        res();
      });
      this.cCollector.on("collect", async (interaction) => {
        autoDeleteMessage(
          interaction.reply({ content: "취소되었습니다.", ephemeral: true }),
        );
        this.end();
        res();
      });
    });
  }
}
