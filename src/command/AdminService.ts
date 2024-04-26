import {
  Slash,
  Discord,
  SlashOption,
  ModalComponent,
  ButtonComponent,
} from "discordx";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  bold,
} from "discord.js";

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
    client: DiscordX.Client,
  ) {
    const modal = new ModalBuilder()
      .setTitle("개인메시지 보내기")
      .setCustomId("dm_modal")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("content")
            .setLabel("내용")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true),
        ),
      );
    await interaction.showModal(modal);
    const modalInteraction = await interaction.awaitModalSubmit({
      time: 10 * 60 * 1000,
    });
    const dmChannel = target.dmChannel ?? (await target.createDM());
    const content = modalInteraction.fields.getTextInputValue("content");
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle("서버메신저")
      .setDescription(content);
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("dm_check_button")
        .setLabel("확인")
        .setStyle(ButtonStyle.Success),
    );
    const dmMessage = await dmChannel.send({
      embeds: [embed],
      components: [button],
    });
    await modalInteraction.reply({
      content: "메시지를 전송했습니다",
      ephemeral: true,
    });

    const channel = (await client.channels.fetch(
      process.env.DM_LOG_CHANNEL_ID,
    )) as Discord.TextBasedChannel;
    const logMessage = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle(target.displayName + "님에게 DM을 보냈습니다.")
          .setDescription(`### 내용\n${content}`),
      ],
    });

    this.messageIdMap.set(dmMessage.id, logMessage.id);
  }

  @ButtonComponent({ id: "dm_check_button" })
  async checkDMButton(
    interaction: Discord.ButtonInteraction,
    client: DiscordX.Client,
  ) {
    if (!interaction.channel) {
      throw new Error("Channel not found");
    }

    const checkEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("확인됨")
      .setDescription(
        bold(interaction.user.displayName) + "님이 DM을 확인했습니다",
      );
    const logMessageId = this.messageIdMap.get(interaction.message.id);
    if (logMessageId) {
      this.messageIdMap.delete(interaction.message.id);

      const channel = (await client.channels.fetch(
        process.env.DM_LOG_CHANNEL_ID,
      )) as Discord.TextBasedChannel;
      const logMessage = await channel.messages.fetch(logMessageId);
      await logMessage.reply({
        embeds: [checkEmbed],
      });
    } else {
      const channel = (await client.channels.fetch(
        process.env.DM_LOG_CHANNEL_ID,
      )) as Discord.TextBasedChannel;
      await channel.send({
        embeds: [checkEmbed],
      });
    }

    await interaction.reply({
      content: "확인했습니다",
      ephemeral: true,
    });
  }
}
