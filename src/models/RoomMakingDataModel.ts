import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

export interface RoomMakingDataData {
  channelId: Discord.Snowflake;
  name: string;
  description: string;
}
interface RoomMakingDataModel extends Model<RoomMakingDataData, {}, {}> {}
const roomMakingDataSchema = new Schema<RoomMakingDataData, RoomMakingDataModel, {}>({
  channelId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
});

const RoomMakingDataModel = mongoose.model<RoomMakingDataData, RoomMakingDataModel>(
  "RoomMakingData",
  roomMakingDataSchema,
);
export default RoomMakingDataModel;
