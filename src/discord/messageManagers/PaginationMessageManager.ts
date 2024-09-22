import { PrimitiveInputType, TextInputResolver } from "@/discord/messageManagers/inputs/InputResolvers";
import PrimitiveInputMessageManager from "@/discord/messageManagers/inputs/PrimitiveInputMessageManager";
import ButtonComponent from "@/discord/components/ButtonComponent";
import MessageManager, { MessageData } from "@/discord/messageManagers/MessageManager";
import { ActionRowBuilder, ButtonStyle } from "discord.js";
import EventEmitter from "node:events";
import TypedEmitter from "typed-emitter";
import Vars from "@/Vars";
import throwInteraction from "@/utils/throwInteraction";

const btn_symbols = [
  { symbol: "⏪", page: -10 },
  { symbol: "◀", page: -1 },
  { symbol: "/", page: 0 },
  { symbol: "▶", page: +1 },
  { symbol: "⏩", page: +10 },
];

type PaginationEvents = {
  change: () => void;
  end: () => void;
};
interface PaginationOptions {
  size: number;
}

export default class PaginationMessageManager extends MessageManager<PaginationOptions>() {
  private currentPage = 0;
  public size!: number;
  public readonly events = new EventEmitter() as TypedEmitter<PaginationEvents>;

  public get $currentPage() {
    return this.currentPage;
  }
  public set $currentPage(value) {
    this.currentPage = value;
  }

  public declare static createOnChannel: OverwriteReturn<
    ReturnType<typeof MessageManager>["createOnChannel"],
    Promise<PaginationMessageManager>
  >;

  public declare static createOnInteraction: OverwriteReturn<
    ReturnType<typeof MessageManager>["createOnInteraction"],
    Promise<PaginationMessageManager>
  >;

  protected static override async createManager(
    message: Discord.Message,
    messageData: MessageData,
    options: PaginationOptions,
  ) {
    const manager = new this(message, messageData, options);
    manager.size = options.size;
    manager.messageData.components[0] = manager.buildButtons();
    const deleteHandler = (msg: Discord.Message | Discord.PartialMessage) => {
      if (msg.id === message.id) {
        manager.events.emit("end");
        Vars.client.off("messageDelete", deleteHandler);
      }
    };
    Vars.client.on("messageDelete", deleteHandler);

    return manager;
  }

  private async updateChanges() {
    for (let i = 0; i < btn_symbols.length; i++) {
      const component = this.messageData.components[0].components[i] as Discord.ButtonBuilder;
      if (btn_symbols[i].symbol == "/") {
        component.setLabel(`${this.currentPage + 1} / ${this.size}`);
      }
      const isDisable =
        this.currentPage + btn_symbols[i].page < 0 || this.currentPage + btn_symbols[i].page > this.size - 1;
      component.setDisabled(isDisable);
    }

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
              const onlyUint = {
                callback: (value: string) => value.match(/^\d+$/) !== null,
                invalidMessage: "자연수만 가능합니다.",
              };
              const onlyInRange = {
                callback: (value: PrimitiveInputType) => +value >= 1 && +value <= this.size,
                invalidMessage: `1부터 ${this.size} 사이의 숫자만 가능합니다.`,
              };
              PrimitiveInputMessageManager.createOnInteraction(interaction, {
                inputResolver: new TextInputResolver(),
                textValidators: [onlyUint],
                valueValidators: [onlyInRange],
                onConfirm: (amount) => {
                  this.currentPage = +amount - 1;
                  this.updateChanges();
                },
              });
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
              this.currentPage + btn_symbols[i].page < 0 || this.currentPage + btn_symbols[i].page > this.size - 1,
          },
          (inter) => {
            throwInteraction(inter);
            this.currentPage += btn_symbols[i].page;
            this.updateChanges();
          },
        ),
      );
    }
    return action_rows;
  }
}
