import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Discord, ButtonComponent } from "discordx";
import EventEmitter from "node:events";
import TypedEmitter from "typed-emitter";

type PaginationEvents = {
  change: () => void;
};
class PaginationContext extends (EventEmitter as new () => TypedEmitter<PaginationEvents>) {
  public currentPage = 0;

  constructor(
    public size: number,
    public messageId: string,
    public manager: PaginationManager,
  ) {
    super();
    manager.contextes.set(messageId, this);
  }

  [Symbol.dispose]() {
    this.removeAllListeners();
    this.manager.contextes.delete(this.messageId);
  }
}

@Discord()
export default class PaginationManager {
  public contextes: Map<string, PaginationContext> = new Map();
  static main: PaginationManager;
  constructor() {
    PaginationManager.main = this;
  }

  @ButtonComponent({ id: /page_count_\-?\d+/ })
  async handler(interaction: Discord.ButtonInteraction) {
    const context = this.contextes.get(interaction.message.id);
    if (!context) return;
    context.currentPage += Number(
      interaction.customId.replaceAll("page_count_", ""),
    );
    await interaction.update({
      components: [PaginationManager.buildButtons(context)],
    });
    context.emit("change");
  }

  static async start(size: number, interaction: Discord.RepliableInteraction) {
    const message = await interaction.editReply({ content: "loading..." });

    const context = new PaginationContext(size, message.id, this.main);
    await interaction.editReply({
      content: null,
      components: [this.buildButtons(context)],
    });
    return context;
  }

  static buildButtons(
    context: PaginationContext,
  ): ActionRowBuilder<ButtonBuilder> {
    const page_count = new ButtonBuilder()
      .setCustomId("page_count")
      .setLabel(`${context.currentPage + 1} / ${context.size}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true /*page_length === 1*/);

    const btn_symbols = [
      { symbol: "⏪", page: -10 },
      { symbol: "◀", page: -1 },
      { symbol: "/", page: 0 },
      { symbol: "▶", page: +1 },
      { symbol: "⏩", page: +10 },
    ];

    let action_rows = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < btn_symbols.length; i++) {
      if (btn_symbols[i].symbol == "/") {
        action_rows.addComponents(page_count);
        continue;
      }

      action_rows.addComponents(
        new ButtonBuilder()
          .setCustomId("page_count_" + btn_symbols[i].page)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(btn_symbols[i].symbol)
          .setDisabled(
            context.currentPage + btn_symbols[i].page < 0 ||
              context.currentPage + btn_symbols[i].page > context.size - 1,
          ),
      );
    }

    return action_rows;
  }
}
