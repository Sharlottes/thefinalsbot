import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder, codeBlock } from "discord.js";
import { Slash, SlashOption, Discord } from "discordx";
import { StatusCodes } from "http-status-codes";
import Vars from "@/Vars";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import colors from "@radix-ui/colors";
import { Fragment } from "react";
import PColors from "@/constants/PColors";
import PaginationMessageManager from "../messageManagers/PaginationMessageManager";
import SlashOptionBuilder from "@/utils/SlashOptionBuilder";

const validVersions = [
  "cb1",
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
const rankColor = [0xea6500, 0xd9d9d9, 0xebb259, 0xc9e3e7, 0x54ebe8, 0xe0115f];

const VersionParameter = SlashOptionBuilder.create({
  name: "버전",
  description: "리더보드 시즌을 선택합니다. (cb1, cb2, ob, s1, s2, live, s3, s3worldtour)",
  required: false,
  type: ApplicationCommandOptionType.String,
  default: "s3",
  validators: [
    [
      (version) => Boolean(!version || validVersions.includes(version)),
      `잘못된 버전입니다.
가능한 버전 값: ${validVersions.join(", ")}`,
    ],
  ],
});

const PlatformParameter = SlashOptionBuilder.create({
  name: "플랫폼",
  description: "리더보드 플랫폼을 선택합니다. (crossplay, steam, xbox, psn)",
  required: false,
  type: ApplicationCommandOptionType.String,
  default: "crossplay",
  validators: [
    [
      (platform) => Boolean(!platform || validPlatforms.includes(platform)),
      `잘못된 플랫폼입니다.
가능한 플랫폼 값: ${validPlatforms.join(", ")}`,
    ],
  ],
});

@Discord()
export default class LeaderboardService {
  @Slash({
    name: "랭킹목록",
    description: "the finals의 모든 리더보드를 조회합니다.",
  })
  async leaderboard(
    @SlashOption(VersionParameter)
    version: string | undefined,
    @SlashOption(PlatformParameter)
    platform: string | undefined,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!version || !platform) return;

    await interaction.deferReply();
    const result = await fetch(`https://api.the-finals-leaderboard.com/v1/leaderboard/${version}/${platform}`)
      .then(async (response) => ({
        status: response.status,
        data: (await response.json()) as LeaderboardData,
      }))
      .catch((e) => console.warn(e)); // print warning and ignore.

    if (result === undefined || result.status != StatusCodes.OK) {
      interaction.editReply("서버에 문제가 있어 명령어를 처리할 수 없습니다. X(");
      return;
    }
    if (result.data.count === 0) {
      interaction.editReply("검색 결과가 없습니다 (ㅠ ㅠ)");
      return;
    }

    const manager = await PaginationMessageManager.createOnInteraction(interaction, {
      size: ~~(result.data.count / 10),
    });
    const handleChange = async () => {
      const svg = await this.buildTableImg(
        result.data.data!.slice(manager.$currentPage * 10, (manager.$currentPage + 1) * 10),
        platform,
        version,
      );
      manager.messageData.files = [new AttachmentBuilder(svg!)];
      await manager.update();
    };
    await handleChange();
    manager.events.on("change", handleChange);
  }
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
    @SlashOption(VersionParameter)
    version: string | undefined,
    @SlashOption(PlatformParameter)
    platform: string | undefined,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!version || !platform) return;

    await interaction.deferReply();
    const searchTarget = target === "*" ? "" : target;
    const result = await fetch(
      `https://api.the-finals-leaderboard.com/v1/leaderboard/${version}/${platform}?name=${searchTarget}`,
    )
      .then(async (response) => ({
        status: response.status,
        data: (await response.json()) as LeaderboardData,
      }))
      .catch((e) => console.warn(e)); // print warning and ignore.
    if (result === undefined || result.status != StatusCodes.OK) {
      interaction.editReply("서버에 문제가 있어 전적검색을 할 수 없습니다. X(");
      return;
    } else if (result.data.count === 0) {
      interaction.editReply("검색 결과가 없습니다 (ㅠ ㅠ)");
      return;
    }

    const manager = await PaginationMessageManager.createOnInteraction(interaction, { size: result.data.count });
    const handleChange = async () => {
      const data = result.data.data![manager.$currentPage]; // 순서상 data가 없는건 불가능
      const rankImgUri =
        "league" in data ? `public/images/ranks/${data.league.toLowerCase().replaceAll(" ", "-")}.png` : "";

      manager.messageData.embeds = [this.buildUserDataEmbed(data)];
      manager.messageData.files = "league" in data ? [new AttachmentBuilder(rankImgUri)] : [];
      await manager.update();
    };
    await handleChange();
    manager.events.on("change", handleChange);
  }

  async buildTableImg(dataset: LeaderBoardUserData[], platform: string, version: string) {
    const tableCells: React.JSX.Element[][] = Array.from({ length: 4 }, () => []);
    dataset.map((data, i) => {
      tableCells[0].push(<p style={{ margin: 0, height: "32px" }}>#{data.rank}</p>);
      tableCells[1].push(
        "change" in data ? (
          <p
            style={{
              margin: 0,
              color: data.change > 0 ? colors.greenDark.green4 : colors.redDark.red4,
              height: "32px",
            }}
          >
            {data.change > 0 ? "+" + data.change : data.change}
          </p>
        ) : (
          <></>
        ),
      );
      tableCells[2].push(<p style={{ margin: 0, height: "32px" }}>{data.name}</p>);
      tableCells[3].push(
        "league" in data ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <img
              src={"data:image/png;base64," + Vars.images[`${data.league.toLowerCase().replaceAll(" ", "-")}.png`]}
              width={32}
              height={32}
            />

            <div
              style={{
                height: "32px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.75em" }}>{data.league}</p>
              {"cashouts" in data && <p style={{ margin: 0, fontSize: "0.75em" }}>${data.cashouts}</p>}
              {"rankScore" in data && <p style={{ margin: 0, fontSize: "0.75em" }}>{data.rankScore}p</p>}
            </div>
          </div>
        ) : "cashouts" in data ? (
          <p style={{ margin: 0, fontSize: "0.75em" }}>${data.cashouts}</p>
        ) : (
          <></>
        ),
      );
    });

    return await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "space-around",
          backgroundColor: colors.ruby.ruby2,
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          padding: "8px",
          fontWeight: "bold",
        }}
      >
        <h2
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          The Finals {version.toUpperCase()} {platform} Leaderboard
        </h2>
        <div
          style={{
            margin: "8px",
            borderRadius: "8px",
            width: "100%",
            height: "1px",
            backgroundColor: colors.gray.gray6,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          {tableCells.map((cells, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-around",
                gap: "8px",
              }}
            >
              {cells.map((cell, j) => (
                <Fragment key={j}>{cell}</Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>,
      {
        width: 700,
        height: 450,

        fonts: [Vars.font],
      },
    ).then((svg) => new Resvg(svg).render().asPng());
  }

  /**
   * returns user data embed object.
   *
   * @returns @typs {EmbedBuilder}
   */
  buildUserDataEmbed(data: LeaderBoardUserData): EmbedBuilder {
    const builder = new EmbedBuilder()
      .setColor(PColors.primary)
      .setTitle(`${data.name}` /*`#${data.rank} - 『${data.name}』`*/)
      .setAuthor({
        name: `THE FINALS TEAMS`,
        iconURL: Vars.client.user?.displayAvatarURL(),
      })
      .addFields({
        name: "순위", //"═════════•°• 순위 •°•═════════",
        value: codeBlock(`${data.rank}`),
        //inline: true
      });
    if ("league" in data) {
      builder.setThumbnail(`attachment://${data.league.toLowerCase().replaceAll(" ", "-")}.png`);
      builder.addFields({
        name: "랭크", //" ═══•°• 랭크 •°•═══",
        value: codeBlock(`${data.league}`),
      });
    }
    if ("change" in data) {
      builder.addFields({
        name: "변동", //" ══•°• 24시간 •°•══",
        value: codeBlock("diff", `${data.change > 0 ? "+" + data.change : data.change}`),
      });
    }
    return builder;
  }
}
