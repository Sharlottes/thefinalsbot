import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import { Slash, SlashOption, Discord, SlashChoice } from "discordx";
import PaginationMessageManager from "../messageManagers/PaginationMessageManager";
import SlashOptionBuilder from "@/utils/SlashOptionBuilder";
import LeaderboardHelpers from "./LeaderboardHelpers";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import PrimitiveInputMessageManager from "../messageManagers/inputs/PrimitiveInputMessageManager";
import { InputResolvers } from "../messageManagers/inputs/InputResolvers";
import TFLeaderboard from "@/core/TFLeaderboard";
import leaderboardsScheme from "@/constants/leaderboardsScheme";

const validVersions = {
  클베1: "cb1",
  클베2: "cb2",
  오픈베타: "ob",
  시즌1: "s1",
  시즌2: "s2",
  시즌3: "s3",
  시즌3월투: "s3worldtour",
  시즌3결승전: "the-finals",
  시즌4: "s4",
  시즌4월투: "s4worldtour",
  시즌4스폰서: "s4sponsor",
  ORF: "orf",
} satisfies Record<string, keyof typeof leaderboardsScheme>;

const validPlatforms = {
  스팀: "steam",
  엑박: "xbox",
  플스: "psn",
  전체: "crossplay",
} satisfies Record<string, Platforms>;

const VersionParameter = SlashOptionBuilder.create({
  name: "버전",
  description: `리더보드 시즌을 선택합니다. ${Object.keys(validVersions).join(", ")}`,
  required: false,
  type: ApplicationCommandOptionType.String,
  default: "시즌4",
  validators: [
    [
      (version) => Boolean(!version || Object.keys(validVersions).includes(version.toUpperCase())),
      `잘못된 버전입니다.
가능한 버전 값: ${Object.keys(validVersions).join(", ")}`,
    ],
  ],
  transformer: (value) => validVersions[value as keyof typeof validVersions],
});

const PlatformParameter = SlashOptionBuilder.create({
  name: "플랫폼",
  description: `리더보드 플랫폼을 선택합니다. ${Object.keys(validPlatforms).join(", ")}`,
  required: false,
  type: ApplicationCommandOptionType.String,
  default: "전체",
  validators: [
    [
      (platform) => Boolean(!platform || Object.keys(validPlatforms).includes(platform)),
      `잘못된 플랫폼입니다.
가능한 플랫폼 값: ${Object.keys(validPlatforms).join(", ")}`,
    ],
  ],
  transformer: (value) => validPlatforms[value as keyof typeof validPlatforms],
});

@Discord()
export default class LeaderboardService {
  @Slash({
    name: "커트라인",
    description: "해당 리더보드에서 각 티어의 커트라인을 확인합니다.",
  })
  async cutline(
    @SlashChoice(...Object.keys(validVersions))
    @SlashOption(VersionParameter)
    version: keyof LeaderboardDataMap | undefined,
    @SlashChoice(...Object.keys(validPlatforms))
    @SlashOption(PlatformParameter)
    platform: Platforms | undefined,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!version || !platform) return;
    // @ts-expect-error
    if (!leaderboardsScheme[version].includes(platform)) {
      autoDeleteMessage(
        ErrorMessageManager.createOnChannel(interaction.channel!, {
          description: "이 버전엔 해당 플렛폼이 없어요! 자동으로 전체 플렛폼에서 찾을게요...",
        }).then((m) => m.message),
      );
      platform = leaderboardsScheme[version][0] as Platforms;
    }

    await interaction.deferReply();
    const leaderboardDataList = (await TFLeaderboard.main.get(version, platform)) as {
      league: string;
      rankScore: number;
    }[];
    if (!leaderboardDataList) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "서버에 문제가 있어 전적검색을 할 수 없습니다. X(",
        }).then((m) => m.message),
      );
      return;
    } else if (!("rankScore" in leaderboardDataList[0] && "league" in leaderboardDataList[0])) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "해당 리더보드에서 랭크 점수를 찾을 수 없습니다.",
        }).then((m) => m.message),
      );
      return;
    }

    let lastLeague = leaderboardDataList[0].league;
    const cutline: Record<string, number> = {};
    for (let i = 0; i < leaderboardDataList.length; i++) {
      const data = leaderboardDataList[i];
      if (data.league !== lastLeague) {
        lastLeague = data.league;
        cutline[leaderboardDataList[i - 1].league] = leaderboardDataList[i - 1].rankScore;
      } else if (i == leaderboardDataList.length - 1) {
        cutline[data.league] = data.rankScore;
      }
    }

    interaction.editReply({
      content: `
## The Finals ${version} 커트라인
${Object.entries(cutline)
  .map(([league, number]) => `* ${league}: ${number}RP`)
  .join("\n")}
      `,
    });
  }

  @Slash({
    name: "리더보드",
    description: "the finals의 모든 리더보드를 조회합니다.",
  })
  async leaderboard(
    @SlashChoice(...Object.keys(validVersions))
    @SlashOption(VersionParameter)
    version: keyof LeaderboardDataMap | undefined,
    @SlashChoice(...Object.keys(validPlatforms))
    @SlashOption(PlatformParameter)
    platform: Platforms | undefined,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!version || !platform) return;
    // @ts-expect-error
    if (!leaderboardsScheme[version].includes(platform)) {
      autoDeleteMessage(
        ErrorMessageManager.createOnChannel(interaction.channel!, {
          description: "이 버전엔 해당 플렛폼이 없어요! 자동으로 전체 플렛폼에서 찾을게요...",
        }).then((m) => m.message),
      );
      platform = leaderboardsScheme[version][0] as Platforms;
    }

    await interaction.deferReply();
    const leaderboardDataList = await TFLeaderboard.main.get(version, platform);
    if (!leaderboardDataList) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "서버에 문제가 있어 전적검색을 할 수 없습니다. X(",
        }).then((m) => m.message),
      );
      return;
    } else if (leaderboardDataList.length === 0) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "검색 결과가 없습니다 (ㅠ ㅠ)",
        }).then((m) => m.message),
      );
      return;
    }

    const manager = await PaginationMessageManager.createOnInteraction(interaction, {
      size: ~~(leaderboardDataList.length / 20),
    });
    manager.messageData.content = `### The Finals ${version} 리더보드 (${Object.keys(validPlatforms).find((key) => validPlatforms[key as keyof typeof validPlatforms] === platform)})`;
    manager.messageData.components[1] = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("처음으로").setStyle(ButtonStyle.Secondary).setCustomId("leaderboard-tofirst-btn"),
      new ButtonBuilder().setLabel("닉네임 찾기").setStyle(ButtonStyle.Success).setCustomId("leaderboard-search-btn"),
      new ButtonBuilder().setLabel("끝으로").setStyle(ButtonStyle.Secondary).setCustomId("leaderboard-tolast-btn"),
    );

    const handleInteraction = async (interaction: Discord.Interaction) => {
      if (!interaction.isButton()) return;
      switch (interaction.customId) {
        case "leaderboard-tofirst-btn":
          manager.$currentPage = 0;
          autoDeleteMessage(interaction.reply("처음 페이지로 이동합니다."), 1500);
          break;

        case "leaderboard-tolast-btn":
          manager.$currentPage = manager.size - 1;
          autoDeleteMessage(interaction.reply("마지막 페이지로 이동합니다."), 1500);
          break;

        case "leaderboard-search-btn":
          await interaction.deferReply({ ephemeral: true });
          const askMessage = await interaction.channel!.send("검색할 닉네임을 입력해주세요.");
          const name = await PrimitiveInputMessageManager.createOnChannel(interaction.channel!, {
            inputResolver: InputResolvers.text,
          }).then((m) => m.value?.toLowerCase());
          askMessage.delete();
          if (!name) return;

          const founds: [string, number][] = [];
          for (let i = 0; i < leaderboardDataList.length; i++) {
            const data = leaderboardDataList[i];
            if (!data.name.toLowerCase().includes(name)) continue;
            founds.push([data.name, ~~(i / 20)]);
          }

          if (founds.length === 0) {
            autoDeleteMessage(
              ErrorMessageManager.createOnInteraction(interaction, {
                description: "검색 결과가 없습니다.",
              }).then((m) => m.message),
              1500,
            );
            return;
          } else if (founds.length === 1) {
            manager.$currentPage = founds[0][1];
            autoDeleteMessage(
              interaction.editReply({
                content: `발견: ${bold(founds[0][0])}. 검색 결과가 1개입니다, 해당 페이지로 이동합니다.`,
              }),
            );
            return;
          } else {
            interaction.editReply({
              content: `검색 결과가 ${founds.length}개입니다.
${founds.map(([name, i]) => `* ${name} (${i + 1}페이지)`).join("\n")}`,
            });
            return;
          }
      }
    };
    const handleChange = async () => {
      const svg = await LeaderboardHelpers.buildTableImg(
        leaderboardDataList.slice(manager.$currentPage * 20, (manager.$currentPage + 1) * 20),
        platform,
        version,
      )!;
      manager.messageData.files = [new AttachmentBuilder(svg)];
      await manager.update();
    };
    const handleOff = () => {
      manager.events.off("change", handleChange);
      Vars.client.off("interactionCreate", handleInteraction);
      clearTimeout(timeout);
    };
    const handleTimeout = async () => {
      const message = await manager.message.fetch();
      if (message.deletable) {
        message.delete();
      }
    };

    await handleChange();
    Vars.client.on("interactionCreate", handleInteraction);
    manager.events.on("change", handleChange);
    manager.events.once("end", handleOff);
    const timeout = setTimeout(handleTimeout, 15 * 60 * 1000);
  }

  @Slash({
    name: "전적검색",
    description: "해당 유저의 리더보드 전적을 탐색합니다.",
  })
  async search(
    @SlashOption({
      name: "검색어",
      description: "리더보드에서 유저를 검색합니다",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    target: string,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply();
    const searchTarget = target === "*" ? "" : target;
    const response = await Promise.all(
      Object.values(validVersions).map(async (version) => ({
        version,
        data: (await TFLeaderboard.main.get(version, "crossplay")) ?? [],
      })),
    );

    const foundList: Record<
      string,
      LeaderboardDataNameMixin & { leaderboard: Partial<Record<keyof LeaderboardDataMap, [string, string]>> }
    > = {};

    for (let i = 0; i < response.length; i++) {
      const leaderboardDataList = response[i].data;
      const founds = leaderboardDataList.filter((data) => data.name.toLowerCase().includes(searchTarget.toLowerCase()));

      for (const found of founds) {
        const exist = foundList[found.name] ?? {};
        exist.name = found.name;
        if (!exist.leaderboard) exist.leaderboard = {};
        if (found.steamName) exist.steamName = found.steamName;
        if (found.xboxName) exist.xboxName = found.xboxName;
        if (found.psnName) exist.psnName = found.psnName;

        const nameMap = Object.fromEntries(Object.entries(validVersions).map(([name, version]) => [version, name]));
        const version = response[i].version;
        switch (version) {
          case "cb1":
          case "cb2":
          case "ob":
          case "s1": {
            const data = found as LeaderboardDataCB | LeaderboardDataOB | LeaderboardDataS1;
            exist.leaderboard[version] = [
              nameMap[version],
              `${bold(data.league)} (${bold(`${data.rank}위`)}, ${data.fame.toLocaleString("en-US")}RP)`,
            ];
            break;
          }
          case "s2": {
            const data = found as LeaderboardDataS2;
            exist.leaderboard[version] = [nameMap[version], `${bold(data.league)} (${bold(`${data.rank}위`)})`];
            break;
          }
          case "s3":
          case "s4": {
            const data = found as LeaderboardDataS3 | LeaderboardDataS4;
            exist.leaderboard[version] = [
              nameMap[version],
              `${bold(data.league)} (${bold(`${data.rank}위`)}, ${data.rankScore.toLocaleString("en-US")}RP)`,
            ];
            break;
          }
          case "s3worldtour":
          case "s4worldtour": {
            const data = found as LeaderboardDataS3WT | LeaderboardDataS4WT;
            exist.leaderboard[version] = [
              nameMap[version],
              `${bold(data.rank.toLocaleString("en-US"))}위 ($${data.cashouts.toLocaleString("en-US")})`,
            ];
            break;
          }
          case "s4sponsor": {
            const data = found as LeaderboardDataS4Sponsor;
            exist.leaderboard[version] = [
              nameMap[version],
              `${data.sponsor} ${bold(data.rank.toLocaleString("en-US"))}위 (${data.fans.toLocaleString("en-US")}명의 팬 보유)`,
            ];
            break;
          }
          case "the-finals": {
            const data = found as LeaderboardDataTF;
            exist.leaderboard[version] = [
              nameMap[version],
              `${bold(data.rank.toLocaleString("en-US"))}위 (${data.tournamentWins.toLocaleString("en-US")}승)`,
            ];
            break;
          }
          case "orf": {
            const data = found as LeaderboardDataORF;
            exist.leaderboard[version] = [
              nameMap[version],
              `${bold(data.rank.toLocaleString("en-US"))}위 (${data.score.toLocaleString("en-US")}점)`,
            ];
            break;
          }
        }
        foundList[found.name] = exist;
      }
    }

    const list = Object.values(foundList);
    if (list.length === 0) {
      autoDeleteMessage(
        ErrorMessageManager.createOnInteraction(interaction, {
          description: "검색 결과가 없습니다.",
        }).then((m) => m.message),
      );
      return;
    }

    let curPage = 0;
    const selectMenu = new StringSelectMenuBuilder().setCustomId("result-select").addOptions(
      list.slice(0, 25).map((data, i) => ({
        label: data.name,
        value: i.toString(),
        description:
          "플렛폼: " +
          (data.steamName ? `스팀: ${data.steamName}, ` : "") +
          (data.xboxName ? `엑박: ${data.xboxName}, ` : "") +
          (data.psnName ? `플스: ${data.psnName}` : ""),
      })),
    );

    const buildEmbed = () => {
      const data = list[curPage];
      return new EmbedBuilder().setTitle(data.name).setDescription(`
        ${data.steamName ? `스팀: ${data.steamName}\n` : ""}${data.xboxName ? `엑박: ${data.xboxName}\n` : ""}${data.psnName ? `플스: ${data.psnName}\n` : ""}
        ${bold("리더보드")}
        ${Object.values(data.leaderboard)
          .map(([version, desc]) => `${version}: ${desc}`)
          .join("\n")}`);
    };

    let message = await interaction.editReply("계산중...");
    let tmpInter: Discord.StringSelectMenuInteraction;
    const rerender = async () => {
      message = await message.edit({
        content: "",
        embeds: [buildEmbed()],
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
      });
      tmpInter?.deleteReply();
      tmpInter = await message.awaitMessageComponent({
        time: 1000 * 60 * 5,
        componentType: ComponentType.StringSelect,
      });
      curPage = +tmpInter.values[0];

      await tmpInter.deferReply({ ephemeral: true });
      await rerender();
    };

    await rerender();
  }
}
