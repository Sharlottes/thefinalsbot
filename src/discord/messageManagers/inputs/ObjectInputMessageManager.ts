import { ComponentType, inlineCode } from "discord.js";
import InputMessageManager, { InputOptions } from "./InputMessageManager";
import { PrimitiveInputResolver, PrimitiveInputType } from "./InputResolvers";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import { MessageData } from "@/discord/messageManagers/MessageManager";

export default class ObjectInputMessageManager<
  PT extends PrimitiveInputType,
> extends InputMessageManager<"object">()<PT> {
  protected static override async createManager<PT extends PrimitiveInputType>(
    message: Discord.Message,
    messageData: MessageData,
    options: InputOptions<PT, "object">,
  ) {
    const manager = new this<PT>(message, messageData, options);

    options.textValidators = options.textValidators ?? [];
    options.textValidators.push({
      callback: (value) => value.includes(":"),
      invalidMessage: `서식이 올바르지 않습니다. ${inlineCode(":")} 문자가 무조건 있어야 합니다.`,
    });
    manager.value = options.value ?? {};
    manager.inputResolver = options.inputResolver;
    message.react("👍");
    await manager.update();
    await manager.setupCollectors();
    return manager;
  }

  protected static override async createMessageData<PT extends PrimitiveInputType>(
    managerOptions: InputOptions<PT, "object">,
  ): Promise<any> {
    const messageData = await super.createMessageData(managerOptions);
    messageData.content = `입력 대기중... 
      * "키":"${managerOptions.inputResolver.getTypeString()}" 서식에 따라 순서대로 메시지를 보내주세요.
      * 입력을 마치려면 👍이모지를 눌러주세요.
      * 현재 입력된 값: ${this.getValueString<PT>(managerOptions.value ?? {}, managerOptions.inputResolver)}`;
    return messageData;
  }

  protected static override getValueString<PT extends PrimitiveInputType>(
    value: Record<string, PT> | undefined,
    inputResolver: PrimitiveInputResolver<PT>,
  ): string {
    if (value === undefined) return "없음";
    return Object.entries(value)
      .map(([key, value]) => `${key}: ${inputResolver.getValueString(value)}`)
      .join("\n");
  }

  public override getValueString(): string {
    return ObjectInputMessageManager.getValueString(this.value, this.inputResolver);
  }

  // 이거 진짜 맞나
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
        const [key, v] = message.content.split(":");
        message.content = v;
        const value = await this.inputResolver.resolveInput(message);
        if (!value) return;

        const isValueValid = this.valueValidate(value);
        if (!isValueValid) return;
        message.react("✅");
        this.responsedMessages.push(message);
        this.value![key] = value;
        this.update();
      });
      this.cCollector.on("collect", async (interaction) => {
        autoDeleteMessage(interaction.reply({ content: "취소되었습니다.", ephemeral: true }));
        this.end();
        res();
      });
    });
  }

  public override async update() {
    this.messageData.content = `입력 대기중... 
* "키":"${this.inputResolver.getTypeString()}" 서식에 따라 순서대로 메시지를 보내주세요.
* 입력을 마치려면 👍이모지를 눌러주세요.
* 현재 입력된 값: ${this.getValueString()}`;
    return super.update();
  }
}
