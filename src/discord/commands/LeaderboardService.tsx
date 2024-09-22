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
      size: ~~(result.data.count / 20),
    });
    const handleChange = async () => {
      const svg = await this.buildTableImg(
        result.data.data!.slice(manager.$currentPage * 20, (manager.$currentPage + 1) * 20),
        platform,
        version,
      )!;
      manager.messageData.files = [new AttachmentBuilder(svg)];
      await manager.update();
    };
    await handleChange();
    manager.events.on("change", handleChange);
    manager.events.once("end", () => manager.events.off("change", handleChange));
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
      manager.events.once("change", handleChange);
    };
    await handleChange();
  }

  async buildTableImg(dataset: LeaderBoardUserData[], platform: string, version: string) {
    const tableCells: React.JSX.Element[][] = Array.from({ length: 3 }, () => []);
    dataset.map((data) => {
      tableCells[0].push(
        <p style={{ margin: 0, height: "32px", position: "relative" }}>
          #{data.rank}
          {"change" in data && (
            <span
              style={{
                margin: 0,
                color: data.change > 0 ? colors.greenDark.green4 : colors.redDark.red4,
                height: "32px",
                fontSize: "0.8em",
                fontWeight: "bold",
                position: "absolute",
                right: "-4px",
                bottom: "-16px",
              }}
            >
              {data.change > 0 ? `+${data.change}` : data.change < 0 ? `${data.change}` : ""}
            </span>
          )}
        </p>,
      );

      const [playerName, playerHandle] = data.name.split("#");
      tableCells[1].push(
        <div style={{ height: "32px", display: "flex", alignItems: "flex-end", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.15em", fontWeight: "bold" }}>{playerName}</span>
          <span style={{ fontSize: "0.7em", color: colors.grayDark.gray6 }}>#{playerHandle}</span>
        </div>,
      );

      const rankImgUri =
        "league" in data
          ? "data:image/png;base64," + Vars.images[`${data.league.toLowerCase().replaceAll(" ", "-")}.png`]
          : "";
      tableCells[2].push(
        "league" in data ? (
          <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
            <img src={rankImgUri} width={32} height={32} />

            <div
              style={{
                height: "32px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85em", fontWeight: "bold" }}>{data.league}</p>
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
    const element = (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#2f2f2f",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            gap: "12px",
            justifyContent: "space-between",
            backgroundColor: colors.cyan.cyan2,
            borderRadius: "24px",
            padding: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              gap: "4px",
              flex: 1,
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
                {cells.slice(0, cells.length / 2).map((cell, j) => (
                  <Fragment key={j}>{cell}</Fragment>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              borderRadius: "8px",
              height: "100%",
              width: "1px",
              backgroundColor: colors.blackA.blackA4,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              gap: "4px",
              flex: 1,
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
                {cells.slice(cells.length / 2, cells.length).map((cell, j) => (
                  <Fragment key={j}>{cell}</Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const svg = await satori(element, {
      width: 700,
      height: 400,
      fonts: [Vars.font],
    });
    return new Resvg(svg).render().asPng();
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
