import { TextInputResolver } from "@/discord/messageManagers/inputs/InputResolvers";
import PrimitiveInputMessageManager from "@/discord/messageManagers/inputs/PrimitiveInputMessageManager";
import ButtonComponent from "@/discord/components/ButtonComponent";
import MessageBuilder from "@/discord/messageManagers/MessageBuilder";
import MessageManager, {
  MessageData,
} from "@/discord/messageManagers/MessageManager";
import { ActionRowBuilder, ButtonStyle } from "discord.js";
import EventEmitter from "node:events";
import TypedEmitter from "typed-emitter";

const btn_symbols = [
  { symbol: "⏪", page: -10 },
  { symbol: "◀", page: -1 },
  { symbol: "/", page: 0 },
  { symbol: "▶", page: +1 },
  { symbol: "⏩", page: +10 },
];

type PaginationEvents = {
  change: () => void;
};
export default class PaginationMessageManager extends MessageManager {
  private currentPage = 0;
  public readonly size: number;
  public readonly events = new EventEmitter() as TypedEmitter<PaginationEvents>;

  public get $currentPage() {
    return this.currentPage;
  }
  public set $currentPage(value) {
    this.currentPage = value;
    this.updateChanges();
  }

  constructor(
    message: Discord.Message,
    messageData: MessageData,
    options: { size: number },
  ) {
    super(message, messageData);
    this.size = options.size;
  }

  public override async postsetManger() {
    await this.updateChanges();
    return super.postsetManger();
  }

  private async updateChanges() {
    this.messageData.components[0] = this.buildButtons();
    await this.update();
    this.events.emit("change");
  }

  private buildButtons() {
    const action_rows = new ActionRowBuilder<ButtonComponent>();

    for (let i = 0; i < btn_symbols.length; i++) {
      if (btn_symbols[i].symbol == "/") {
        action_rows.addComponents(
          ButtonComponent.create(
            {
              label: `${this.currentPage + 1} / ${this.size}`,
              disabled: this.size === 1,
              style: ButtonStyle.Secondary,
            },
            (interaction) => {
              new PrimitiveInputMessageManager.Builder().send(
                "interaction",
                interaction,
                {
                  inputResolver: new TextInputResolver(),
                  textValidators: [
                    {
                      callback: (value) => value.match(/^\d+$/) !== null,
                      invalidMessage: "자연수만 가능합니다.",
                    },
                  ],
                  valueValidators: [
                    {
                      callback: (value) => +value >= 1 && +value <= this.size,
                      invalidMessage: `1부터 ${this.size} 사이의 숫자만 가능합니다.`,
                    },
                  ],
                  onConfirm: (amount) => {
                    this.currentPage = +amount;
                    this.updateChanges();
                  },
                },
              );
            },
          ),
        );
        continue;
      }

      action_rows.addComponents(
        ButtonComponent.create(
          {
            emoji: btn_symbols[i].symbol,
            disabled:
              this.currentPage + btn_symbols[i].page < 0 ||
              this.currentPage + btn_symbols[i].page > this.size - 1,
          },
          () => {
            this.currentPage += btn_symbols[i].page;
            this.updateChanges();
          },
        ),
      );
    }
    return action_rows;
  }

  public static override Builder = MessageBuilder(PaginationMessageManager);
}
