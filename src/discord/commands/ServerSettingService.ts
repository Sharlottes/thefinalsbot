import ServerSettingModel from "@/models/ServerSetting";
import { PermissionGuard } from "@discordx/utilities";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  inlineCode,
} from "discord.js";
import { Discord, Guard, Slash, SlashGroup } from "discordx";

@Discord()
@SlashGroup({ name: "서버설정", description: "서버 설정 관련 명령어" })
@Guard(PermissionGuard(["Administrator"]))
export class ServerSettingService {
  @Slash({ name: "채널", description: "채널 지정을 바꿉니다." })
  async setting(interaction: Discord.ChatInputCommandInteraction) {
    interaction.deferReply({ ephemeral: true });
    const serverSettings = await ServerSettingModel.findOne({
      guildId: interaction.guildId,
      botId: interaction.client.user!.id,
    });
    if (!serverSettings) {
      throw new Error("서버 설정이 존재치 않는건 불가능합니다.");
    }

    const message = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("채널 지정")
          .setFields(
            Object.entries(serverSettings.channels).map(([name, id]) => ({
              name,
              value: `<#${id}>`,
            })),
          )
          .setFooter({
            text: "참고: 메시지를 실수로 삭제해도 완료를 누르기 전엔 절대 반영되지 않습니다.",
          }),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("channel_select")
            .setPlaceholder("채널 선택")
            .addOptions(
              Object.keys(serverSettings.channels).map((name) => ({
                label: name,
                value: name,
              })),
            ),
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents([
          new ButtonBuilder()
            .setCustomId("channel_submit")
            .setLabel("완료")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("channel_cancel")
            .setLabel("취소")
            .setStyle(ButtonStyle.Secondary),
        ]),
      ],
    });
    const componentInteraction = await message.awaitMessageComponent();
    componentInteraction.deferReply({ ephemeral: true });
    if (componentInteraction.isStringSelectMenu()) {
      const value = componentInteraction
        .values[0] as keyof typeof serverSettings.channels;

      const embed = new EmbedBuilder()
        .setTitle("채널 지정")
        .setDescription(inlineCode(value) + "로 지정할 채널을 멘션해주세요.");

      const retry = async (): Promise<Discord.Channel> => {
        componentInteraction.editReply({
          embeds: [embed.setFooter({ text: "대기중..." })],
        });

        const userMessage = await componentInteraction
          .channel!.awaitMessages({
            filter: (msg) => msg.author.id === interaction.user.id,
            max: 1,
            time: 1000 * 60 * 10,
          })
          .then((messages) => messages.first());
        if (!userMessage) throw new Error("메시지를 찾을 수 없습니다.");
        const channel = userMessage.mentions.channels.first();
        if (!channel) {
          await componentInteraction.editReply({
            embeds: [embed.setFooter({ text: "채널을 찾을 수 없습니다." })],
          });
          return retry();
        }
        return channel;
      };
      const channel = await retry();
      serverSettings.channels[value] = channel;
    } else if (componentInteraction.customId === "channel_submit") {
      await serverSettings.save();
      await componentInteraction.editReply("완료되었습니다.");
    } else if (componentInteraction.customId === "channel_cancel") {
      await componentInteraction.editReply("취소되었습니다.");
    }
  }
}
