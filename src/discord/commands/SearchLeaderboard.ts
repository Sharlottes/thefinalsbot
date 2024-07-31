import type {
  LeaderBoardUserData,
  LeaderboardData,
  LeaderboardConstructor,
} from "@/@types/searchData";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  codeBlock,
} from "discord.js";
import { Slash, SlashOption, Discord } from "discordx";
import { StatusCodes } from "http-status-codes";
import ErrorMessageManager from "../embeds/ErrorMessageManager";
import Vars from "@/Vars";

const validVersions = [
  "b1",
  "closedbeta1",
  "cb2",
  "closedbeta2",
  "ob",
  "openbeta",
  "s1",
  "season1",
  "s2",
  "season2",
  "live",
  "s3",
  "season3",
  "s3worldtour",
  "season3worldtour",
];
const validPlatforms = ["steam", "xbox", "psn", "crossplay"];

@Discord()
export default class SearchLeaderboard {
  // pagination cache dataset
  data: Map<string, LeaderboardConstructor> = new Map();

  @Slash({
    name: "전적검색",
    description: "TheFinals의 랭크를 검색합니다 (최소순위 10000위)",
  })
  async search(
    @SlashOption({
      name: "검색어",
      description: "리더보드에서 유저를 검색합니다 (* <= 전체검색)",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    target: string,
    @SlashOption({
      name: "버전",
      description:
        "리더보드 시즌을 선택합니다. (b1, cb2, ob, s1, s2, live, s3, s3worldtour)",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    version: string | undefined,
    @SlashOption({
      name: "플랫폼",
      description:
        "리더보드 플랫폼을 선택합니다. (crossplay, steam, xbox, psn)",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    platform: string | undefined,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply();

    if (version && !validVersions.includes(version)) {
      interaction.editReply("잘못된 버전 값입니다.");
      new ErrorMessageManager(interaction, {
        description: `잘못된 버전입니다.
가능한 버전 값: ${validVersions.join(", ")}`,
      }).update();
      return;
    }
    if (platform && !validPlatforms.includes(platform)) {
      interaction.editReply("잘못된 플랫폼 값입니다.");
      new ErrorMessageManager(interaction, {
        description: `잘못된 플랫폼입니다.
가능한 플랫폼 값: ${validPlatforms.join(", ")}`,
      }).update();
      return;
    }

    const result = await fetch(
      `https://api.the-finals-leaderboard.com/v1/leaderboard/${version ?? "s3"}/${platform ?? "crossplay"}?name=${target === "*" ? "" : target}`,
    )
      .then(async (response) => ({
        status: response.status,
        data: (await response.json()) as LeaderboardData,
      }))
      .catch((e) => console.warn(e)); // print warning and ignore.

    if (result === undefined || result.status != StatusCodes.OK) {
      interaction.editReply("서버에 문제가 있어 전적검색을 할 수 없습니다. X(");
      return;
    }
    if (result.data.count === 0) {
      interaction.editReply("검색 결과가 없습니다 (ㅠ ㅠ)");
      return;
    }

    // initialize interaction data.
    this.data.set(interaction.id, {
      page: 0,
      leaderboard: result.data,
    });

    const response = await interaction.editReply({
      embeds: [this.getEmbed(interaction.id)],
      components: [this.getPageButton(interaction.id)],
      files: [
        new AttachmentBuilder(
          `public/images/ranks/${result.data.data?.[0].league.toLowerCase().replaceAll(" ", "-")}.png`,
        ),
      ],
    });

    // collectors
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      idle: 20_000,
    });
    collector.on("collect", async (collected_interaction) => {
      const data = this.data.get(interaction.id)!; // 순서상 data가 없는건 불가능
      const nowPage =
        data.page +
        Number(collected_interaction.customId.replaceAll("page_count_", ""));

      // update Page
      this.data.set(interaction.id, {
        page: nowPage,
        leaderboard: data.leaderboard,
      });

      await collected_interaction.update({
        embeds: [this.getEmbed(interaction.id)],
        components: [this.getPageButton(interaction.id)],
        files: [
          new AttachmentBuilder(
            `public/images/ranks/${data.leaderboard.data?.[nowPage].league.toLowerCase().replaceAll(" ", "-")}.png`,
          ),
        ],
      });
    });

    collector.on("end", async () => {
      this.data.delete(interaction.id);
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
      data?.leaderboard.data?.[data.page] || {
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
    const rank_color = [
      0xea6500, 0xd9d9d9, 0xebb259, 0xc9e3e7, 0x54ebe8, 0xe0115f,
    ];
    return new EmbedBuilder()
      .setColor(rank_color[Math.floor((data.leagueNumber - 1) / 4)])
      .setTitle(`${data.name}` /*`#${data.rank} - 『${data.name}』`*/)
      .setAuthor({
        name: `THE FINALS TEAMS`,
        iconURL: Vars.client.user?.displayAvatarURL(),
      })
      .setThumbnail(
        `attachment://${data.league.toLowerCase().replaceAll(" ", "-")}.png`,
      )
      .addFields(
        {
          name: "순위", //"═════════•°• 순위 •°•═════════",
          value: codeBlock(`${data.rank}`),
          //inline: true
        },
        // { name: "\u200B", value: "\u200B" },
        {
          name: "랭크", //" ═══•°• 랭크 •°•═══",
          value: codeBlock(`${data.league}`),
          //inline: true,
        },
        {
          name: "변동", //" ══•°• 24시간 •°•══",
          value: codeBlock(
            "diff",
            `${data.change > 0 ? "+" + data.change : data.change}`,
          ),
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
            (data?.page || 0) + btn_symbols[i].page < 0 ||
              (data?.page || 0) + btn_symbols[i].page >
                (data?.leaderboard?.count || 0) - 1,
          ),
      );
    }

    return action_rows;
  }
}
