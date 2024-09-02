import ServerSettingManager from "@/core/ServerSettingManager";
import ServerSettingModel from "@/models/ServerSetting";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { PermissionGuard } from "@discordx/utilities";
import { Discord, Guard, Slash, SlashGroup, SlashOption } from "discordx";
import MasterGuard from "../guards/MasterGuard";
import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import Vars from "@/Vars";
import PrimitiveInputMessageManager from "../messageManagers/inputs/PrimitiveInputMessageManager";
import {
  InputResolvers,
  TextInputResolver,
} from "../messageManagers/inputs/InputResolvers";
import RoomMakingDataModel from "@/models/RoomMakingDataModel";

@Discord()
@SlashGroup({
  name: "서버설정",
  description: "이 서버에 대한 여러 설정을 관리합니다.",
})
@Guard(PermissionGuard(["Administrator"]), MasterGuard)
export class ServerSettingService {
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

  @SlashGroup("서버설정")
  @Slash({
    name: "방생성",
    description: "해당 채널에 대한 파티방 생성 정보를 수정합니다.",
  })
  async roomMakingChannelSetting(
    @SlashOption({
      name: "채널",
      description: "방 생성 정보를 수정할 채널",
      required: true,
      type: ApplicationCommandOptionType.Channel,
    })
    channel: Discord.TextChannel,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!interaction.channel) return;
    if (channel.type !== ChannelType.GuildText) {
      autoDeleteMessage(
        new ErrorMessageManager.Builder()
          .send("interaction", interaction, {
            description: "텍스트 채널이어야 합니다.",
          })
          .then((m) => m.message),
      );
      return;
    }

    await interaction.reply("설정을 시작합니다.");

    const nameAskMsg = await interaction.channel.send("이름을 입력해주세요.");
    const name = await new PrimitiveInputMessageManager.Builder().send(
      "channel",
      interaction.channel,
      {
        inputResolver: InputResolvers.text,
        value: Vars.roomMakingAnnounceData[channel.id]?.name,
      },
    );
    await nameAskMsg.delete();

    const descriptionAskMsg =
      await interaction.channel.send("설명을 입력해주세요.");
    const description = await new PrimitiveInputMessageManager.Builder().send(
      "channel",
      interaction.channel,
      {
        inputResolver: new TextInputResolver(),
        value: Vars.roomMakingAnnounceData[channel.id]?.description,
      },
    );
    await descriptionAskMsg.delete();

    await RoomMakingDataModel.updateOne(
      { channelId: channel.id },
      {
        channelId: channel.id,
        name: name.value,
        description: description.value,
      },
      { upsert: true },
    );

    autoDeleteMessage(
      interaction.channel.send("방 정보가 수정되었습니다."),
      1500,
    );
  }
}
