import ServerSettingManager from "@/core/ServerSettingManager";
import ServerSettingModel from "@/models/ServerSetting";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { PermissionGuard } from "@discordx/utilities";
import { Discord, Guard, Slash, SlashGroup } from "discordx";
import MasterGuard from "../guards/MasterGuard";

@Discord()
@Guard(PermissionGuard(["Administrator"]), MasterGuard)
export class ServerSettingService {
  @Slash({ name: "서버설정", description: "서버 설정 명령어" })
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
}
