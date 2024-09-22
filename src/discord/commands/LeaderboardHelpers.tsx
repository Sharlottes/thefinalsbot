import { EmbedBuilder, codeBlock } from "discord.js";
import Vars from "@/Vars";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import colors from "@radix-ui/colors";
import { Fragment } from "react";
import PColors from "@/constants/PColors";

const rankColor = [0xea6500, 0xd9d9d9, 0xebb259, 0xc9e3e7, 0x54ebe8, 0xe0115f];
export default class LeaderboardHelpers {
  public static async buildTableImg(dataset: LeaderBoardUserData[], platform: string, version: string) {
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
  public static buildUserDataEmbed(data: LeaderBoardUserData): EmbedBuilder {
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