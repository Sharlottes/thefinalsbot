import Discord, {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import MessageManager, { MessageData } from "./MessageManager";
import ButtonComponent from "../components/ButtonComponent";
import ignoreInteraction from "../../utils/ignoreInteraction";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import ErrorMessageManager from "./ErrorMessageManager";
import MessageBuilder from "./MessageBuilder";

export default class KeypadMessageManager extends MessageManager {
  private amount = 0;
  private readonly callback: (amount: number) => void;
  private readonly mainEmbed: EmbedBuilder;
  private readonly max?: number;
  private readonly min?: number;

  public constructor(
    message: Discord.Message,
    messageData: MessageData,
    options: { callback: (amount: number) => void; min?: number; max?: number },
  ) {
    super(message, messageData);
    this.messageData.content = "";
    this.min = options.min;
    this.max = options.max;
    this.callback = options.callback;
    this.mainEmbed = new EmbedBuilder()
      .setTitle("ItemPad")
      .setFields([{ name: "Amount", value: this.amount.toString() }]);
    this.messageData.embeds = [this.mainEmbed];

    let stack = 0;
    for (let i = 1; i <= 3; i++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let j = 1; j <= 3; j++) {
        stack++;
        let sstack = stack;
        row.addComponents(
          ButtonComponent.create(
            message.id,
            sstack.toString(),
            async (interaction) => {
              ignoreInteraction(interaction);
              this.amount = await this.validate(this.amount * 10 + sstack);
              this.updateEmbed();
            },
          ),
        );
      }
      this.messageData.components.push(row);
    }

    this.messageData.components.push(
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.create(this.message.id, "0", (interaction) => {
          ignoreInteraction(interaction);
          this.amount *= 10;
          this.updateEmbed();
        }),
        ButtonComponent.create(
          this.message.id,

          "del",
          async (interaction) => {
            ignoreInteraction(interaction);
            this.amount = await this.validate(Math.floor(this.amount / 10));
            this.updateEmbed();
          },
          { style: ButtonStyle.Danger },
        ),
        ButtonComponent.create(
          this.message.id,

          "done",
          (interaction) => {
            ignoreInteraction(interaction);
            this.callback(this.amount);
            this.remove();
          },
          { style: ButtonStyle.Success },
        ),
      ),
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.create(
          this.message.id,

          "cancel",
          (interaction) => {
            ignoreInteraction(interaction);
            this.remove();
          },
          { style: ButtonStyle.Secondary },
        ),
        ButtonComponent.create(
          this.message.id,

          "reset",
          (interaction) => {
            ignoreInteraction(interaction);
            this.amount = Math.min(0, this.min ?? 0);
            this.updateEmbed();
          },
          { style: ButtonStyle.Secondary },
        ),
        ...(this.max !== undefined
          ? [
              ButtonComponent.create(
                this.message.id,

                "max",
                (interaction) => {
                  ignoreInteraction(interaction);
                  this.amount = this.max!;
                  this.updateEmbed();
                },
                { style: ButtonStyle.Secondary },
              ),
            ]
          : []),
      ),
    );
  }

  private async validate(number: number) {
    if (this.min !== undefined && number < this.min) {
      await autoDeleteMessage(
        ErrorMessageManager.Builder.send("channel", this.message.channel, {
          description: `${this.min}보다 작아선 안됩니다. (${number})`,
        }).then((m) => m.message),
      );
      return this.amount;
    }
    if (this.max !== undefined && number > this.max) {
      await autoDeleteMessage(
        ErrorMessageManager.Builder.send("channel", this.message.channel, {
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

  public static override Builder = new MessageBuilder(KeypadMessageManager);
}
