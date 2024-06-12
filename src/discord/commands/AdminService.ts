import { Slash, Discord, SlashOption, ButtonComponent } from "discordx";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  bold,
} from "discord.js";
import Vars from "@/Vars";
import PColors from "@/constants/PColors";

@Discord()
export default class AdminService {
  messageIdMap = new Map<string, string>();

  @Slash({
    name: "갠디",
    description: "DM을 보냅니다",
    defaultMemberPermissions: ["CreatePrivateThreads"],
  })
  async sendDM(
    @SlashOption({
      name: "대상",
      description: "DM을 보낼 대상",
      required: true,
      type: ApplicationCommandOptionType.User,
    })
    target: Discord.User,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    const channel = interaction.channel;
    if (!channel) throw new Error("Channel not found");

    await interaction.deferReply();
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("개인메시지 보내기")
          .setDescription(
            `
DM 메시지를 보내려면 이 채널에 메시지를 보내주세요.
메시지의 내용 및 파일들을 모두 해당 유저에게 전달합니다.`,
          ),
      ],
    });
    const userMessage = await channel
      .awaitMessages({
        filter: (msg) => msg.author.id === interaction.user.id,
        max: 1,
        time: 1000 * 60 * 10,
        errors: ["time"],
      })
      .then((messages) => messages.first());
    if (!userMessage) throw new Error("[/디엠] 메시지를 찾을 수 없습니다.");

    const messageOptions = {
      content: userMessage.content,
      files: userMessage.attachments.map((attachment) => attachment.url),
    } satisfies Discord.MessageCreateOptions;

    const confirmAskMessage = await userMessage.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("메시지 확인")
          .setDescription(
            `정말로 아래 메시지를 ${target.displayName}님에게 전송하시겠습니까?`,
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("dm_confirm_button")
            .setLabel("확인")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("dm_cancel_button")
            .setLabel("취소")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
    await channel.send(messageOptions);

    const buttonInteraction = await confirmAskMessage.awaitMessageComponent({
      filter: (interaction) => interaction.user.id === userMessage.author.id,
      time: 1000 * 60 * 5,
      componentType: ComponentType.Button,
    });
    if (buttonInteraction.customId === "dm_cancel_button") {
      buttonInteraction.reply({
        content: "취소되었습니다",
      });
      return;
    }
    await buttonInteraction.deferReply();

    const dmChannel = target.dmChannel ?? (await target.createDM());
    const dmMessage = await dmChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("서버메신저")
          .setDescription(messageOptions.content),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("dm_check_button")
            .setLabel("확인")
            .setStyle(ButtonStyle.Success),
        ),
      ],
      files: messageOptions.files,
    });
    await buttonInteraction.editReply({
      content: "메시지를 전송했습니다",
    });

    const logMessage = await Vars.dmLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle(target.displayName + "님에게 DM을 보냈습니다.")
          .setDescription(`### 내용\n${messageOptions.content}`),
      ],
      files: messageOptions.files,
    });
    this.messageIdMap.set(dmMessage.id, logMessage.id);
  }

  @ButtonComponent({ id: "dm_check_button" })
  async checkDMButton(interaction: Discord.ButtonInteraction) {
    if (!interaction.channel) {
      throw new Error("Channel not found");
    }

    const checkEmbed = new EmbedBuilder()
      .setColor(PColors.primary)
      .setTitle("확인됨")
      .setDescription(
        bold(interaction.user.displayName) + "님이 DM을 확인했습니다",
      );
    const logMessageId = this.messageIdMap.get(interaction.message.id);
    if (logMessageId) {
      this.messageIdMap.delete(interaction.message.id);

      const logMessage = await Vars.dmLogChannel.messages.fetch(logMessageId);
      await logMessage.reply({
        embeds: [checkEmbed],
      });
    } else {
      await Vars.dmLogChannel.send({
        embeds: [checkEmbed],
      });
    }

    await interaction.reply({
      content: "확인했습니다",
      ephemeral: true,
    });
  }
}
