import ServerSettingManager from "@/core/ServerSettingManager";
import ServerSettingModel from "@/models/ServerSetting";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { PermissionGuard } from "@discordx/utilities";
import { Discord, Guard, Slash, SlashGroup, SlashOption } from "discordx";
import MasterGuard from "../guards/MasterGuard";
import { ApplicationCommandOptionType } from "discord.js";
import ServerSettingService from "./ServerSettingService";
import SlashOptionBuilder from "@/utils/SlashOptionBuilder";

const roomMakerChannelOption = SlashOptionBuilder.create({
  name: "채널",
  description: "방 생성자가 등록되거나 등록될 채널",
  type: ApplicationCommandOptionType.Channel,
});
const roomMakerNameOption = SlashOptionBuilder.create({
  name: "이름",
  description: "방 생성자의 이름 (ex: 월투, 터랭)",
  type: ApplicationCommandOptionType.String,
});
const roomMakerDescriptionOption = SlashOptionBuilder.create({
  name: "설명",
  description: "방 생성자의 설명",
  type: ApplicationCommandOptionType.String,
});

@Discord()
@SlashGroup({
  name: "서버설정",
  description: "이 서버에 대한 여러 설정을 관리합니다.",
})
@SlashGroup({
  name: "방생성",
  description: "해당 채널에 대한 파티방 생성 정보를 조회/수정합니다.",
  root: "서버설정",
})
@Guard(PermissionGuard(["Administrator"]), MasterGuard)
export default class ServerSettingHandler {
  @SlashGroup("서버설정")
  @Slash({ name: "초기화", description: "서버 채널 설정을 새로 정합니다." })
  async setting(interaction: Discord.ChatInputCommandInteraction) {
    interaction.deferReply({ ephemeral: true });
    const serverSettings = await ServerSettingModel.findOne({
      guildId: interaction.guildId,
      botId: interaction.client.user!.id,
    });
    if (!serverSettings) {
      throw new Error("서버 설정이 존재치 않는건 불가능합니다.");
    }
    autoDeleteMessage(interaction.reply("채널 설정을 변경합니다."), 1500);
    await ServerSettingManager.main.requestSettingInit(interaction.guild!);
  }

  @SlashGroup("방생성", "서버설정")
  @Slash({
    name: "추가",
    description: "방 생성자를 새로 등록합니다.",
  })
  async createNewRoomMaker(
    @SlashOption(roomMakerChannelOption)
    channel: Discord.TextChannel | null,
    @SlashOption(roomMakerNameOption)
    name: string | null,
    @SlashOption(roomMakerDescriptionOption)
    description: string | null,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    ServerSettingService.main.addRoomMaker(
      interaction,
      channel ?? undefined,
      name ?? undefined,
      description ?? undefined,
    );
  }

  @SlashGroup("방생성", "서버설정")
  @Slash({
    name: "수정",
    description: "기존 방 생성자를 수정합니다.",
  })
  async editRoomMaker(
    @SlashOption(roomMakerChannelOption)
    channel: Discord.TextChannel | null,
    @SlashOption(roomMakerNameOption)
    name: string | null,
    @SlashOption(roomMakerDescriptionOption)
    description: string | null,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    ServerSettingService.main.editRoomMaker(
      interaction,
      channel ?? undefined,
      name ?? undefined,
      description ?? undefined,
    );
  }

  @SlashGroup("방생성", "서버설정")
  @Slash({
    name: "삭제",
    description: "기존 방 생성자를 삭제합니다.",
  })
  async removeRoomMaker(
    @SlashOption(roomMakerChannelOption)
    channel: Discord.TextChannel | null,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    ServerSettingService.main.removeRoomMaker(interaction, channel ?? undefined);
  }

  @SlashGroup("방생성", "서버설정")
  @Slash({
    name: "조회",
    description: "모든 방 생성자를 확인합니다.",
  })
  async viewRoomMakers(interaction: Discord.ChatInputCommandInteraction) {
    ServerSettingService.main.showRoomMakers(interaction);
  }
}
