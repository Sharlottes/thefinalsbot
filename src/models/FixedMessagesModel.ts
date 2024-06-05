import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

declare global {
  interface FixedMessageData {
    messageId: string;
    channelId: string;
  }
}
interface FixedMessageModel extends Model<FixedMessageData, {}, {}> {
  findUserByInteration(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<HydratedDocument<FixedMessageData, {}> | undefined>;
}
const fixedMessageSchema = new Schema<FixedMessageData, FixedMessageModel, {}>({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
});

const FixedMessageModel = mongoose.model<FixedMessageData, FixedMessageModel>(
  "FixedMessage",
  fixedMessageSchema,
);
export default FixedMessageModel;
