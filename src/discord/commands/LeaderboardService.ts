import { ActionRowBuilder, ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import { Slash, SlashOption, Discord } from "discordx";
import { StatusCodes } from "http-status-codes";
import PaginationMessageManager from "../messageManagers/PaginationMessageManager";
import SlashOptionBuilder from "@/utils/SlashOptionBuilder";
import LeaderboardHelpers from "./LeaderboardHelpers";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";

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
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "서버에 문제가 있어 전적검색을 할 수 없습니다. X(",
        }).then((m) => m.message),
      );
      return;
    } else if (result.data.count === 0) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "검색 결과가 없습니다 (ㅠ ㅠ)",
        }).then((m) => m.message),
      );
      return;
    }
    const leaderboardDataList = result.data.data!;

    const manager = await PaginationMessageManager.createOnInteraction(interaction, {
      size: ~~(result.data.count / 20),
    });
    const handleChange = async () => {
      const svg = await LeaderboardHelpers.buildTableImg(
        leaderboardDataList.slice(manager.$currentPage * 20, (manager.$currentPage + 1) * 20),
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
      .catch((e) => console.warn(e));
    if (result === undefined || result.status != StatusCodes.OK) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "서버에 문제가 있어 전적검색을 할 수 없습니다. X(",
        }).then((m) => m.message),
      );
      return;
    } else if (result.data.count === 0) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "검색 결과가 없습니다 (ㅠ ㅠ)",
        }).then((m) => m.message),
      );
      return;
    }
    const leaderboardDataList = result.data.data!;

    const manager = await PaginationMessageManager.createOnInteraction(interaction, { size: result.data.count });
    const handleChange = async () => {
      const data = leaderboardDataList[manager.$currentPage];
      const rankImgUri =
        "league" in data ? `public/images/ranks/${data.league.toLowerCase().replaceAll(" ", "-")}.png` : "";

      manager.messageData.embeds = [LeaderboardHelpers.buildUserDataEmbed(data)];
      manager.messageData.files = "league" in data ? [new AttachmentBuilder(rankImgUri)] : [];
      await manager.update();
      manager.events.once("change", handleChange);
    };
    await handleChange();
  }
}
