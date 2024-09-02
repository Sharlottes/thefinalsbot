import { Slash, Discord, SlashOption, ButtonComponent } from "discordx";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  bold,
} from "discord.js";
import Vars from "@/Vars";
import PColors from "@/constants/PColors";
import throwInteraction from "@/utils/throwInteraction";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";

@Discord()
export default class AdminService {
  @Slash({
    name: "갠디",
    description: "DM을 보냅니다",
    defaultMemberPermissions: ["CreatePrivateThreads"],
  })
  async sendDM(
    @SlashOption({
      name: "역할",
      description: "DM을 받을 역할",
      required: false,
      type: ApplicationCommandOptionType.Role,
    })
    role: Discord.Role | null,
    @SlashOption({
      name: "대상",
      description: "DM을 받을 대상",
      required: false,
      type: ApplicationCommandOptionType.User,
    })
    target: Discord.User | null,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    const channel = interaction.channel;
    if (!channel) throw new Error("Channel not found");
    if (!role && !target) {
      await autoDeleteMessage(
        new ErrorMessageManager.Builder()
          .send("interaction", interaction, {
            description: "역할 또는 대상을 입력해주세요.",
          })
          .then((m) => m.message),
      );
      return;
    }
    if (target && target.bot) {
      await autoDeleteMessage(
        new ErrorMessageManager.Builder()
          .send("interaction", interaction, {
            description: "봇은 DM을 받을 수 없습니다...",
          })
          .then((m) => m.message),
      );
      return;
    }

    if (role) {
      await interaction.guild?.members.fetch();
    }
    const targets = (
      role ? Array.from(role.members.values()).filter((t) => !t.user.bot) : []
    ) as Array<Discord.GuildMember | Discord.User>;
    if (target) targets.push(target);
    const targetNames = targets.map((t) => t.displayName).join(", ");

    await interaction.deferReply();
    const guideMessage = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle("개인메시지 보내기")
          .setDescription(
            `
DM 메시지를 보내려면 이 채널에 메시지를 보내주세요.
메시지의 내용을 모두 ${bold(targetNames)}에게 전달합니다.`,
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
            `정말로 아래 메시지를 ${bold(targetNames)}님에게 전송하시겠습니까?`,
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
    const confirmSampleMessage = await channel.send(messageOptions);

    const buttonInteraction = await confirmAskMessage.awaitMessageComponent({
      filter: (interaction) => interaction.user.id === userMessage.author.id,
      time: 1000 * 60 * 5,
      componentType: ComponentType.Button,
    });
    if (buttonInteraction.customId === "dm_cancel_button") {
      await Promise.all([
        buttonInteraction.reply({
          content: "취소되었습니다",
        }),
        guideMessage.delete(),
        userMessage.delete(),
        confirmAskMessage.delete(),
        confirmSampleMessage.delete(),
      ]);
      return;
    }
    await Promise.all([
      throwInteraction(buttonInteraction),
      guideMessage.delete(),
      userMessage.delete(),
      confirmAskMessage.delete(),
      confirmSampleMessage.delete(),
    ]);
    const logMessage = await Vars.dmLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(PColors.primary)
          .setTitle(bold(targetNames) + "님에게 DM을 보냈습니다.")
          .setDescription(
            `내용\n----------------------\n${messageOptions.content}`,
          )
          .setAuthor({
            name: interaction.user.displayName,
            iconURL: interaction.user.displayAvatarURL(),
          }),
      ],
      files: messageOptions.files,
    });
    Promise.all(
      targets.map(async (target) =>
        (target.dmChannel ?? (await target.createDM())).send({
          embeds: [
            new EmbedBuilder()
              .setColor(PColors.primary)
              .setTitle("서버메신저")
              .setDescription(messageOptions.content)
              .setFooter({ text: `id: ${logMessage.id}` }),
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
        }),
      ),
    );
  }

  @ButtonComponent({ id: "dm_check_button" })
  async checkDMButton(interaction: Discord.ButtonInteraction) {
    if (!interaction.channel) {
      throw new Error("Channel not found");
    }
    const logMessage = await Vars.dmLogChannel.messages.fetch(
      interaction.message.embeds[0].footer!.text.replace("id: ", ""),
    );
    Promise.all([
      logMessage.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(PColors.primary)
            .setTitle("확인됨")
            .setDescription(
              bold(interaction.user.displayName) + "님이 DM을 확인했습니다",
            ),
        ],
      }),
      interaction.reply({
        content: "확인했습니다",
        ephemeral: true,
      }),
    ]);
  }
}
