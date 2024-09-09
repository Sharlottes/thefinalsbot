import autoDeleteMessage from "@/utils/autoDeleteMessage";
import { channelMention, EmbedBuilder, inlineCode } from "discord.js";
import ErrorMessageManager from "../messageManagers/ErrorMessageManager";
import PrimitiveInputMessageManager from "../messageManagers/inputs/PrimitiveInputMessageManager";
import { InputResolvers } from "../messageManagers/inputs/InputResolvers";
import RoomMakingDataModel from "@/models/RoomMakingDataModel";
import RoomMaker from "../features/RoomsMaker";

export default class ServerSettingService {
  public static readonly main = new this();

  public async addRoomMaker(
    interaction: Discord.RepliableInteraction,
    roomChannel?: Discord.Channel,
    roomName?: string,
    roomDescription?: string,
  ) {
    if (!interaction.channel) return;

    if (roomChannel) {
      const exist = await RoomMakingDataModel.findOne({
        channelId: roomChannel!.id,
      });
      if (exist) {
        autoDeleteMessage(
          ErrorMessageManager.createOnInteraction(interaction, {
            description: `이미 ${exist.name}(으)로 사용 중인 채널입니다.`,
          }).then((m) => m.message),
        );
        return;
      }
    }

    const message = await interaction.reply("방 생성자를 등록합니다.");
    const render = () =>
      message.edit(`
* 채널: ${roomChannel?.id ? channelMention(roomChannel?.id) : "없음"}
* 이름: ${inlineCode(roomName ?? "없음")}
* 설명: ${inlineCode(roomDescription ?? "없음")}`);
    if (!roomChannel || !roomName || !roomDescription) await render();

    if (!roomChannel) {
      roomChannel = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.channel,
          valueValidators: [
            {
              callback: (channel) =>
                !RoomMaker.main.data.find((d) => d.channel.id == channel.id),
              invalidMessage: `${RoomMaker.main.data.map((d) => channelMention(d.channel.id)).join(", ")}들은 이미 사용 중인 채널입니다.`,
            },
          ],
        },
      ).then((m) => m.value);
      await render();
    }

    if (!roomName) {
      roomName = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.text,
        },
      ).then((m) => m.value);
      await render();
    }

    if (!roomDescription) {
      roomDescription = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.text,
        },
      ).then((m) => m.value);
      await render();
    }

    await RoomMakingDataModel.create({
      channelId: roomChannel!.id,
      name: roomName,
      description: roomDescription,
    });

    message.delete();
    autoDeleteMessage(
      interaction.channel.send("방 생성자가 등록되었습니다."),
      1500,
    );
  }

  public async editRoomMaker(
    interaction: Discord.RepliableInteraction,
    roomChannel?: Discord.Channel,
    roomName?: string,
    roomDescription?: string,
  ) {
    if (!interaction.channel) return;

    if (roomChannel) {
      const exist = await RoomMakingDataModel.findOne({
        channelId: roomChannel!.id,
      });
      if (!exist) {
        autoDeleteMessage(
          ErrorMessageManager.createOnInteraction(interaction, {
            description: "해당 채널은 등록되지 않았습니다.",
          }).then((m) => m.message),
        );
        return;
      }
    }

    const message = await interaction.reply("방 생성자를 수정합니다.");
    const render = () =>
      message.edit(`
* 채널: ${roomChannel?.id ? channelMention(roomChannel?.id) : "없음"}
* 이름: ${inlineCode(roomName ?? "없음")}
* 설명: ${inlineCode(roomDescription ?? "없음")}`);
    if (!roomChannel || !roomName || !roomDescription) await render();

    if (!roomChannel) {
      roomChannel = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.channel,
          valueValidators: [
            {
              callback: (channel) =>
                !!RoomMaker.main.data.find((d) => d.channel.id == channel.id),
              invalidMessage: `이 채널은 등록되지 않았습니다.
${RoomMaker.main.data.map((d) => channelMention(d.channel.id)).join(", ")} 사이에서 선택해 주세요.`,
            },
          ],
        },
      ).then((m) => m.value);
      await render();
    }

    if (!roomName) {
      roomName = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.text,
        },
      ).then((m) => m.value);
      await render();
    }

    if (!roomDescription) {
      roomDescription = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.text,
        },
      ).then((m) => m.value);
      await render();
    }
    await RoomMakingDataModel.updateOne(
      { channelId: roomChannel!.id },
      {
        channelId: roomChannel!.id,
        name: roomName,
        description: roomDescription,
      },
      { upsert: true },
    );

    message.delete();
    autoDeleteMessage(
      interaction.channel.send("방 생성자가 수정되었습니다."),
      1500,
    );
  }

  public async removeRoomMaker(
    interaction: Discord.RepliableInteraction,
    roomChannel?: Discord.Channel,
  ) {
    if (!interaction.channel) return;
    await interaction.deferReply();

    if (!roomChannel) {
      roomChannel = await PrimitiveInputMessageManager.createOnChannel(
        interaction.channel,
        {
          inputResolver: InputResolvers.channel,
          valueValidators: [
            {
              callback: (channel) =>
                !!RoomMaker.main.data.find((d) => d.channel.id == channel.id),
              invalidMessage: `이 채널은 등록되지 않았습니다.
${RoomMaker.main.data.map((d) => channelMention(d.channel.id)).join(", ")} 사이에서 선택해 주세요.`,
            },
          ],
        },
      ).then((m) => m.value);
    }

    await RoomMakingDataModel.deleteOne({ channelId: roomChannel!.id });

    autoDeleteMessage(
      interaction.editReply("성공적으로 방 생성자를 삭제했습니다."),
      1500,
    );
  }

  public async showRoomMakers(interaction: Discord.RepliableInteraction) {
    if (!interaction.channel) return;

    await interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle("RoomMaker 목록").setDescription(`
      ${RoomMaker.main.data
        .map((data) => `* ${data.name}: ${channelMention(data.channel.id)}`)
        .join("\n")}`),
      ],
    });
  }
}
