import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

export interface FixedMessageData {
  guildId: string;
  channels: string[];
}
interface FixedMessageModel extends Model<FixedMessageData, {}, {}> {}
const fixedMessageSchema = new Schema<FixedMessageData, FixedMessageModel, {}>({
  guildId: { type: String, required: true, unique: true },
  channels: { type: [String], required: true, unique: true },
});

const FixedMessageModel = mongoose.model<FixedMessageData, FixedMessageModel>("FixedMessage", fixedMessageSchema);
export default FixedMessageModel;
