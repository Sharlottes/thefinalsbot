import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

declare global {
  interface FixedMessageData {
    guildId: string;
    channels: string[];
  }
}
interface FixedMessageModel extends Model<FixedMessageData, {}, {}> {
  findUserByInteration(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<HydratedDocument<FixedMessageData, {}> | undefined>;
}
const fixedMessageSchema = new Schema<FixedMessageData, FixedMessageModel, {}>({
  guildId: { type: String, required: true, unique: true },
  channels: { type: [String], required: true, unique: true },
});

const FixedMessageModel = mongoose.model<FixedMessageData, FixedMessageModel>("FixedMessage", fixedMessageSchema);
export default FixedMessageModel;
