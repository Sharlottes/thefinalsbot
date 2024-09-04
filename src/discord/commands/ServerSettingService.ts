import ServerSettingManager from "@/core/ServerSettingManager";
import ServerSettingModel from "@/models/ServerSetting";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { PermissionGuard } from "@discordx/utilities";
import {
  Discord,
  Guard,
  Slash,
  SlashChoice,
  SlashGroup,
  SlashOption,
} from "discordx";
import MasterGuard from "../guards/MasterGuard";
import {
  ApplicationCommandOptionType,
  channelMention,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import Vars from "@/Vars";
import PrimitiveInputMessageManager from "../messageManagers/inputs/PrimitiveInputMessageManager";
import {
  InputResolvers,
  TextInputResolver,
} from "../messageManagers/inputs/InputResolvers";
import RoomMakingDataModel from "@/models/RoomMakingDataModel";
import RoomMaker from "../features/RoomsMaker";

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
    description: "해당 채널에 대한 파티방 생성 정보를 조회/수정합니다.",
  })
  async roomMakingChannelSetting(
    @SlashChoice("조회", "추가", "수정", "삭제")
    @SlashOption({
      name: "유형",
      description: "이 설정에서 할 작업",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    type: "조회" | "추가" | "수정" | "삭제",
    @SlashOption({
      name: "채널",
      description: "방 생성 정보를 수정할 채널",
      type: ApplicationCommandOptionType.Channel,
    })
    channel: Discord.TextChannel | null,

    interaction: Discord.ChatInputCommandInteraction,
  ) {
    if (!interaction.channel) return;

    switch (type) {
      case "조회":
        await interaction.reply({
          embeds: [
            new EmbedBuilder().setTitle("RoomMaker 목록").setDescription(`
      ${RoomMaker.main.data
        .map((data) => `* ${data.name}: ${channelMention(data.channel.id)}`)
        .join("\n")}`),
          ],
        });
        break;
      case "추가":
      // TODO: implement add room making
      case "수정":
      case "삭제":
        if (!channel) {
          const nameAskMsg = await interaction.channel
            .send(`수정/삭제할 채널이 필요합니다. 
 채널을 입력해주세요.`);
          channel = await PrimitiveInputMessageManager.createOnChannel(
            interaction.channel,
            {
              inputResolver: InputResolvers.channel,
              valueValidators: [
                {
                  callback: (channel) =>
                    !!RoomMaker.main.data.find(
                      (d) => d.channel.id == (channel as Discord.Channel).id,
                    ),
                  invalidMessage: `유효하지 않은 값입니다.
  가능한 값: ${RoomMaker.main.data.map((d) => d.name).join(", ")}`,
                },
              ],
            },
          ).then((m) => m.value as Discord.TextChannel);
          nameAskMsg.delete();
        } else if (channel.type !== ChannelType.GuildText) {
          autoDeleteMessage(
            ErrorMessageManager.createOnInteraction(interaction, {
              description: "텍스트 채널이어야 합니다.",
            }).then((m) => m.message),
          );
          return;
        }
        if (!channel) {
          RoomMaker.main.sendErrorMessage(
            interaction,
            "채널을 찾을 수 없습니다.",
          );
          return;
        }

        if (type == "삭제") {
          RoomMaker.main.data.splice(
            RoomMaker.main.data.findIndex((d) => d.channel.id == channel!.id),
          );
          await RoomMakingDataModel.deleteOne({ channelId: channel.id });
        } else {
          const descriptionAskMsg =
            await interaction.channel.send("설명을 입력해주세요.");
          const description =
            await PrimitiveInputMessageManager.createOnChannel(
              interaction.channel,
              {
                inputResolver: new TextInputResolver(),
                value: Vars.roomMakingAnnounceData[channel.id]?.description,
              },
            ).then((m) => m.value);

          await Promise.all([
            descriptionAskMsg.delete(),
            RoomMakingDataModel.updateOne(
              { channelId: channel.id },
              {
                channelId: channel.id,
                name: channel.name,
                description,
              },
              { upsert: true },
            ),
          ]);
        }
        break;
    }

    autoDeleteMessage(
      interaction.channel.send("방 정보가 수정되었습니다."),
      1500,
    );
  }
}
