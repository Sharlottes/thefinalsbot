import type {
  LeaderBoardUserData,
  LeaderboardData,
  leaderboardConstructor,
} from "@/@types/searchData";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { ButtonComponent, Slash, SlashOption, Discord } from "discordx";
import { StatusCodes } from "http-status-codes";
import { injectable } from "tsyringe";

@Discord()
export default class SearchLeaderboard {
  data: Map<string, leaderboardConstructor> = new Map();

  // we will need an attatchment initializer
  logo: AttachmentBuilder = new AttachmentBuilder('public/images/logo.png');

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

    // initialize interaction data.
    const id = interaction.id;
    this.data.set(id, {
      page: 0,
      leaderboard: (await result.data) as LeaderboardData,
    });

    if (this.data.get(id)?.leaderboard?.count === 0) {
      interaction.editReply("검색 결과가 없습니다 (ㅠ ㅠ)");

      this.data.delete(id); // destory interaction data.
      return;
    }

    // collectors
    const response = await interaction.editReply({
      embeds: [this.getEmbed(id)],
      components: [this.getPageButton(id)],
      files: [this.logo]
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      idle: 20_000,
    });

    collector.on("collect", async (collected_interaction) => {
      let nowPage = this.data.get(interaction.id)?.page || 0;
      nowPage += Number(
        collected_interaction.customId.replaceAll("page_count_", ""),
      );

      // update Page
      this.data.set(id, {
        page: nowPage,
        leaderboard: this.data.get(id)?.leaderboard,
      });

      await collected_interaction.update({
        embeds: [this.getEmbed(id)],
        components: [this.getPageButton(id)],
        files: [this.logo]
      });
    });

    collector.on("end", async () => {
      this.data.delete(id);
      await interaction.editReply({ components: [] });
    });
  }

  /**
   * returns the leaderboard data based on the current page.
   *
   * @returns @typs {LeaderBoardUserData}
   */
  getLeaderBoardData(id: string): LeaderBoardUserData {
    const data = this.data.get(id);
    return (
      data?.leaderboard?.data?.[data.page] || {
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
  getEmbed(id: string): EmbedBuilder {
    const data = this.getLeaderBoardData(id);
    const rank_color = [0xea6500, 0xd9d9d9, 0xebb259, 0xc9e3e7, 0x54ebe8];

    return new EmbedBuilder()
      .setColor(rank_color[Math.floor((data.leagueNumber - 1) / 4)])
      .setTitle(`${data.name}`/*`#${data.rank} - 『${data.name}』`*/)
      .setAuthor({
        name: `THE FINALS TEAMS`,
        iconURL: `attachment://logo.png`,
      })
      .setThumbnail(
        `https://storage.googleapis.com/embark-discovery-leaderboard/img/thumbs/${data.league.toLowerCase().replaceAll(" ", "-")}-thumb.png`,
      )
      .addFields(
        {
            name: "순위", //"═════════•°• 순위 •°•═════════",
            value: `\`\`\`${data.rank}\`\`\``,
            //inline: true
        },
        // { name: "\u200B", value: "\u200B" },
        {
          name: "랭크",//" ═══•°• 랭크 •°•═══",
          value: `\`\`\`${data.league}\`\`\``,
          //inline: true,
        },
        {
          name: "변동",//" ══•°• 24시간 •°•══",
          value: `\`\`\`diff\n${data.change > 0 ? "+" + data.change : data.change}\n\`\`\``,
          //inline: true,
        },
      );
  }

  /**
   * returns page button ActionRows for move to page.
   *
   * @returns @typs {ActionRowBuilder<ButtonBuilder>}
   */
  getPageButton(id: string): ActionRowBuilder<ButtonBuilder> {
    const data = this.data.get(id);
    const page_count = new ButtonBuilder()
      .setCustomId("page_count")
      .setLabel(`${(data?.page || 0) + 1} / ${data?.leaderboard?.count}`)
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
            (data?.page || 0) + btn_symbols[i].page < 0 ||
              (data?.page || 0) + btn_symbols[i].page >
                (data?.leaderboard?.count || 0) - 1,
          ),
      );
    }

    return action_rows as ActionRowBuilder<ButtonBuilder>;
  }
}
