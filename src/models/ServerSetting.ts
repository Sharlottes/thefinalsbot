import { Snowflake } from "discord.js";
import mongoose, { Schema, Model } from "mongoose";

declare global {
  interface ServerSettingData {
    guildId: string;
    botId: string;
    channels: {
      dmLogChannelId: Snowflake; // DM메시지 로그 채널
      matchmakedCategoryId: Snowflake; // 매치메이킹된 방들이 들어갈 카테고리
      matchmakingAnnounceChannelId: Snowflake; // 매치메이킹 고정임베드 채널
      matchmakingWaitingChannelId: Snowflake; // 매치메이킹 대기방 채널
      invalidInviteGuilds: Snowflake[]; // 초대링크 차단된 서버들
    };
  }
}

export const ChannelsSchema = new Schema<ServerSettingData["channels"]>({
  dmLogChannelId: String,
  matchmakedCategoryId: String,
  matchmakingAnnounceChannelId: String,
  matchmakingWaitingChannelId: String,
  invalidInviteGuilds: [String],
});

export const ServerSettingSchema = new Schema<ServerSettingData>({
  guildId: { type: String, required: true },
  botId: { type: String, required: true },
  channels: { type: ChannelsSchema, required: true },
});

const ServerSettingModel = mongoose.model<
  ServerSettingData,
  Model<ServerSettingData, {}, {}>
>("ServerSetting", ServerSettingSchema);
export default ServerSettingModel;
