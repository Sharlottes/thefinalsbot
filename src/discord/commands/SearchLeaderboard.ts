import type { LeaderBoardUserData, LeaderboardData } from "@/@types/searchData";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { ButtonComponent, Slash, SlashOption, Discord } from "discordx";
import { StatusCodes } from "http-status-codes";
import { injectable } from "tsyringe";

@Discord()
@injectable()
export default class SearchLeaderboard {
  page: number;
  leaderboard: LeaderboardData | undefined;

  constructor() {
    this.page = 0;
  }

  @ButtonComponent({ id: /^page_count_-?\d+$/ })
  async button(interaction: ButtonInteraction) {
    this.page += Number(interaction.customId.replaceAll("page_count_", ""));
    const data = this.getLeaderBoardData();

    await interaction.update({
      embeds: [this.getEmbed()],
      components: [this.getPageButton()],
    });
  }

  @Slash({
    name: "전적검색",
    description: "TheFinals의  랭크를 검색합니다 (최소순위 10000위)",
  })
  async search(
    @SlashOption({
      name: "검색어",
      description: "리더보드에서 유저를 검색합니다 (* <= 전체검색)",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    target: Discord.User,
    interaction: Discord.ChatInputCommandInteraction,
    client: DiscordX.Client,
  ) {
    await interaction.deferReply();

    let name_tag = interaction.options.getString("검색어");
    name_tag = name_tag === "*" ? "" : name_tag; // The input * means all search.

    const result = await fetch(
      `https://api.the-finals-leaderboard.com/v1/leaderboard/s2/crossplay?name=${name_tag}`,
    )
      .then((response) => ({ status: response.status, data: response.json() }))
      .catch((e) => console.warn(e)); // print warning and ignore.

    if (result === undefined || result.status != StatusCodes.OK) {
      interaction.editReply("서버에 문제가 있어 전적검색을 할 수 없습니다. X(");
      return;
    }

    this.leaderboard = (await result.data) as LeaderboardData;

    if (this.leaderboard.count === 0) {
      interaction.editReply("검색 결과가 없습니다 (ㅠ ㅠ)");
      return;
    }

    const response = await interaction.editReply({
      embeds: [this.getEmbed()],
      components: [this.getPageButton()],
    });
  }

  /**
   * returns the leaderboard data based on the current page.
   *
   * @returns @typs {LeaderBoardUserData}
   */
  getLeaderBoardData(): LeaderBoardUserData {
    return (
      this.leaderboard?.data?.[this.page] || {
        rank: -1,
        change: 0,
        leagueNumber: 0,
        league: "Unranked",
        name: "???",
        steamName: "",
        xboxName: "",
        psnName: "",
        cashouts: 0,
      }
    );
  }

  /**
   * returns user data embed object.
   *
   * @returns @typs {EmbedBuilder}
   */
  getEmbed(): EmbedBuilder {
    const data = this.getLeaderBoardData();
    const rank_color = [0xea6500, 0xd9d9d9, 0xebb259, 0xc9e3e7, 0x54ebe8];

    return new EmbedBuilder()
      .setColor(rank_color[Math.floor((data.leagueNumber - 1) / 4)])
      .setTitle(`#${data.rank} - 『${data.name}』`)
      .setAuthor({
        name: `THE FINALS TEAMS`,
        iconURL: `https://cdn.discordapp.com/avatars/1219832567570890833/889af2fc8b96fc95cf833a4395092813.webp?size=1024`,
      })
      .setThumbnail(
        `https://storage.googleapis.com/embark-discovery-leaderboard/img/thumbs/${data.league.toLowerCase().replaceAll(" ", "-")}-thumb.png`,
      )
      .addFields(
        { name: "\u200B", value: "\u200B" },
        {
          name: " ═══•°• 랭크 •°•═══",
          value: `\`\`\`${data.league}\`\`\``,
          inline: true,
        },
        {
          name: " ══•°• 24시간 •°•══",
          value: `\`\`\`diff\n${data.change > 0 ? "+" + data.change : data.change}\n\`\`\``,
          inline: true,
        },
      );
  }

  /**
   * returns page button ActionRows for move to page.
   *
   * @returns @typs {ActionRowBuilder<ButtonBuilder>}
   */
  getPageButton(): ActionRowBuilder<ButtonBuilder> {
    const page_count = new ButtonBuilder()
      .setCustomId("page_count")
      .setLabel(`${this.page + 1} / ${this.leaderboard?.count}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true /*page_length === 1*/);

    const btn_symbols = [
      { symbol: "⏪", page: -10 },
      { symbol: "◀", page: -1 },
      { symbol: "/", page: 0 },
      { symbol: "▶", page: +1 },
      { symbol: "⏩", page: +10 },
    ];

    let action_rows = new ActionRowBuilder();

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
            this.page + btn_symbols[i].page < 0 ||
              this.page + btn_symbols[i].page >
                (this.leaderboard?.count || 0) - 1,
          ),
      );
    }

    return action_rows as ActionRowBuilder<ButtonBuilder>;
  }
}
