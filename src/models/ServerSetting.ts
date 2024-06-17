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
      roomMakingAnnounceChannels: Record<string, Snowflake>; // 방 생성 고정임베드 채널
      invalidInviteGuilds: Snowflake[]; // 초대링크 차단된 서버들
    };
  }
}
const ServerSettingSchema = new Schema<
  ServerSettingData,
  Model<ServerSettingData, {}, {}>,
  {}
>({
  guildId: String,
  channels: {
    dmLogChannelId: String,
    matchmakedCategoryId: String,
    matchmakingAnnounceChannelId: String,
    matchmakingWaitingChannelId: String,
    roomMakingAnnounceChannels: {
      type: Map,
      of: String,
    },
    invalidInviteGuilds: [String],
  },
});

const ServerSettingModel = mongoose.model<
  ServerSettingData,
  Model<ServerSettingData, {}, {}>
>("ServerSetting", ServerSettingSchema);
export default ServerSettingModel;
