import VoiceChannelManager from "@/core/VoiceChannelManager";
import autoDeleteMessage from "@/utils/autoDeleteMessage";
import {
  ActionRowBuilder,
  ChannelType,
  inlineCode,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  userMention,
} from "discord.js";
import { ButtonComponent, Discord, ModalComponent, On } from "discordx";
import RoomsMakerService from "./RoomsMakerService";

@Discord()
export default class RoomsMakerHandler {
  @ButtonComponent({ id: /create_voice_channel-.*/ })
  private async createVoiceChannel(interaction: Discord.ButtonInteraction) {
    const roomType = interaction.customId.split("-")[1];
    const name = roomType + " 대화방";
    const voiceChannel = await VoiceChannelManager.createVoiceChannel(name, {
      owner: interaction.user,
    });

    const data = RoomsMakerService.main.findDataByName(roomType);
    if (!data) return;
    data.channels.add(voiceChannel);
    data.messages.set(voiceChannel.id, []);

    await autoDeleteMessage(
      interaction.reply({
        content: `${name}이 생성되었습니다. 
[바로가기](discord://-/channels/${voiceChannel.guildId}/${voiceChannel.id})`,
        ephemeral: true,
      }),
    );
  }

  @ButtonComponent({ id: /show_voice_channel_invite-.*/ })
  private async showVoiceChannelInvite(
    interaction: Discord.ButtonInteraction<"cached">,
  ) {
    const channel =
      await RoomsMakerService.main.getUserVoiceChannel(interaction);
    if (!channel) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "음성방에 입장해 주세요.",
      );
      return null;
    }

    const data = RoomsMakerService.main.findDataByChannelId(channel.id);
    if (!data) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "등록되지 않은 방입니다.",
      );
      return;
    }

    const channelType = interaction.customId.split("-")[1];
    if (data.name !== channelType) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        `유효하지 않은 방입니다.
${data.name} LFG에서 사용해주세요.`,
      );
      return;
    }

    autoDeleteMessage(
      interaction.reply({ content: inlineCode(channel.url), ephemeral: true }),
    );
    const message = await interaction.channel!.send(
      `${userMention(interaction.user.id)} ${channel.url}`,
    );
    data.messages.get(channel.id)?.push(message);
  }

  @ButtonComponent({ id: /change_voice_channel-.*/ })
  async changeVoiceChannel(interaction: Discord.ButtonInteraction<"cached">) {
    const channel =
      await RoomsMakerService.main.getUserVoiceChannel(interaction);
    if (!channel) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "음성방에 입장해 주세요.",
      );
      return null;
    }

    const data = RoomsMakerService.main.findDataByChannelId(channel.id);
    if (!data) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "등록되지 않은 방입니다.",
      );
      return;
    }

    const canManage = channel
      .permissionsFor(interaction.user)
      ?.has(PermissionFlagsBits.ManageChannels);
    if (!canManage) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "방을 관리할 권한이 없습니다.",
      );
      return;
    }

    await interaction.showModal(
      new ModalBuilder()
        .setTitle(channel.name + " 음성방 변경")
        .setCustomId("room-change-modal-" + data.name)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("capacity")
              .setLabel("최대 인원")
              .setValue(channel.userLimit.toString())
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("name")
              .setLabel("이름")
              .setValue(channel.name)
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        ),
    );
  }

  @ModalComponent({ id: /room-change-modal-.*/ })
  async changeVoiceChannelModal(interaction: Discord.ModalSubmitInteraction) {
    const channel =
      await RoomsMakerService.main.getUserVoiceChannel(interaction);
    if (!channel) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "음성방에 입장해 주세요.",
      );
      return null;
    }
    const [capacity, name] = ["capacity", "name"].map((n) =>
      interaction.fields.getTextInputValue(n),
    );
    if (Number.isNaN(+capacity) || +capacity < 0) {
      RoomsMakerService.main.sendErrorMessage(
        interaction,
        "자연수만 가능합니다.",
      );
      return;
    }

    const promises: Promise<unknown>[] = [];
    if (channel.userLimit !== +capacity)
      promises.push(channel.setUserLimit(+capacity));
    if (channel.name !== name) promises.push(channel.setName(name));
    await Promise.all(promises);
    autoDeleteMessage(
      interaction.reply({
        content: capacity + "으로 변경되었습니다.",
        ephemeral: true,
      }),
    );
  }

  @On({ event: "channelDelete" })
  private async onChannelDelete([channel]: DiscordX.ArgsOf<"channelDelete">) {
    if (channel.type !== ChannelType.GuildVoice) return;
    const data = RoomsMakerService.main.findDataByChannelId(channel.id);
    if (!data) return;

    const messages = data.messages.get(channel.id);
    data.messages.delete(channel.id);
    data.channels.delete(channel);
    if (!messages) return;
    await Promise.all(messages.map((m) => m.delete().catch(() => {})));
  }
}
