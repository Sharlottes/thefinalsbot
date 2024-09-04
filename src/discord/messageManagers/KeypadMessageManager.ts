import Discord, {
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import ButtonComponent from "../components/ButtonComponent";
import ignoreInteraction from "../../utils/ignoreInteraction";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import ErrorMessageManager from "./ErrorMessageManager";

export interface KeypadMessageOptions {
  callback: (amount: number) => void;
  min?: number;
  max?: number;
}
export default class KeypadMessageManager extends MessageManager<KeypadMessageOptions>() {
  public amount = 0;
  private callback!: (amount: number) => void;
  private mainEmbed!: EmbedBuilder;
  private max?: number;
  private min?: number;

  static override async createManager(
    message: Discord.Message,
    messageData: MessageData,
    options: KeypadMessageOptions,
  ) {
    const manager = new this(message, messageData, options);

    manager.min = options.min;
    manager.max = options.max;
    manager.callback = options.callback;
    manager.mainEmbed = new EmbedBuilder().setFields([
      { name: "Amount", value: manager.amount.toString() },
    ]);
    manager.messageData.embeds = [manager.mainEmbed];
    let stack = 0;
    for (let i = 1; i <= 3; i++) {
      const row = new ActionRowBuilder<ButtonComponent>();
      for (let j = 1; j <= 3; j++) {
        stack++;
        let sstack = stack;
        row.addComponents(
          ButtonComponent.create(
            { label: sstack.toString() },
            async (interaction) => {
              ignoreInteraction(interaction);
              manager.amount = await manager.validate(
                manager.amount * 10 + sstack,
              );
              manager.updateEmbed();
            },
          ),
        );
      }
      manager.messageData.components.push(row);
    }

    manager.messageData.components.push(
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.create({ label: "0" }, (interaction) => {
          ignoreInteraction(interaction);
          manager.amount *= 10;
          manager.updateEmbed();
        }),
        ButtonComponent.create(
          { label: "del", style: ButtonStyle.Danger },
          async (interaction) => {
            ignoreInteraction(interaction);
            manager.amount = await manager.validate(
              Math.floor(manager.amount / 10),
            );
            manager.updateEmbed();
          },
        ),
        ButtonComponent.create(
          { label: "done", style: ButtonStyle.Success },
          (interaction) => {
            ignoreInteraction(interaction);
            manager.callback(manager.amount);
            manager.remove();
          },
        ),
      ),
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.create(
          { label: "cancel", style: ButtonStyle.Secondary },
          (interaction) => {
            ignoreInteraction(interaction);
            manager.remove();
          },
        ),
        ButtonComponent.create(
          { label: "reset", style: ButtonStyle.Secondary },
          (interaction) => {
            ignoreInteraction(interaction);
            manager.amount = Math.min(0, manager.min ?? 0);
            manager.updateEmbed();
          },
        ),
        ...(manager.max !== undefined
          ? [
              ButtonComponent.create(
                { label: "max", style: ButtonStyle.Secondary },
                (interaction) => {
                  ignoreInteraction(interaction);
                  manager.amount = manager.max!;
                  manager.updateEmbed();
                },
              ),
            ]
          : []),
      ),
    );
    return manager;
  }

  private async validate(number: number) {
    if (this.min !== undefined && number < this.min) {
      await autoDeleteMessage(
        ErrorMessageManager.createOnChannel(this.message.channel, {
          description: `${this.min}보다 작아선 안됩니다. (${number})`,
        }).then((m) => m.message),
      );
      return this.amount;
    }
    if (this.max !== undefined && number > this.max) {
      await autoDeleteMessage(
        ErrorMessageManager.createOnChannel(this.message.channel, {
          description: `${this.max}보다 커선 안됩니다. (${number})`,
        }).then((m) => m.message),
      );
      return this.amount;
    }

    return number;
  }

  private async updateEmbed() {
    this.mainEmbed.setFields([
      {
        name: "Amount",
        value: this.amount.toString(),
      },
    ]);
    await this.update();
  }
}
