import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Slash, SlashOption, Discord, SlashChoice } from "discordx";
import { StatusCodes } from "http-status-codes";
import PaginationMessageManager from "../messageManagers/PaginationMessageManager";
import SlashOptionBuilder from "@/utils/SlashOptionBuilder";
import LeaderboardHelpers from "./LeaderboardHelpers";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import Vars from "@/Vars";
import PrimitiveInputMessageManager from "../messageManagers/inputs/PrimitiveInputMessageManager";
import { InputResolvers } from "../messageManagers/inputs/InputResolvers";

const validVersions = {
  클베1: "cb1",
  클베2: "cb2",
  오픈베타: "ob",
  시즌1: "s1",
  시즌2: "s2",
  시즌3: "s3",
  시즌3월투: "s3worldtour",
};
const validPlatforms = {
  스팀: "steam",
  엑박: "xbox",
  플스: "psn",
  전체: "crossplay",
};

const VersionParameter = SlashOptionBuilder.create({
  name: "버전",
  description: `리더보드 시즌을 선택합니다. ${Object.keys(validVersions).join(", ")}`,
  required: false,
  type: ApplicationCommandOptionType.String,
  default: "시즌3",
  validators: [
    [
      (version) => Boolean(!version || Object.keys(validVersions).includes(version)),
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
    name: "리더보드",
    description: "the finals의 모든 리더보드를 조회합니다.",
  })
  async leaderboard(
    @SlashChoice(...Object.keys(validVersions))
    @SlashOption(VersionParameter)
    version: string | undefined,
    @SlashChoice(...Object.keys(validPlatforms))
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
    description: "TheFinals의 랭크를 검색합니다. (최소순위 10000위)",
  })
  async search(
    @SlashOption({
      name: "검색어",
      description: "리더보드에서 유저를 검색합니다 (* <= 전체검색)",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    target: string,
    @SlashChoice(...Object.keys(validVersions))
    @SlashOption(VersionParameter)
    version: string | undefined,
    @SlashChoice(...Object.keys(validPlatforms))
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
    };
    const handleOff = () => {
      manager.events.off("change", handleChange);
      clearTimeout(timeout);
    };
    const handleTimeout = async () => {
      const message = await manager.message.fetch();
      if (message.deletable) {
        message.delete();
      }
    };
    await handleChange();
    manager.events.on("change", handleChange);
    manager.events.once("end", handleOff);
    const timeout = setTimeout(handleTimeout, 15 * 60 * 1000);
  }
}
