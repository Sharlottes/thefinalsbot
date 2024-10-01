import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

interface LeaderboardCacheData {
  data: {
    point: number;
    rank: number;
    league: string;
  }[];
  name: string;
  version: string;
  lastUpdated: Date;
}

const AddressSchema = new Schema({
  point: Number,
  league: String,
  rank: Number,
});

interface LeaderboardCacheModel extends Model<LeaderboardCacheData, {}, {}> {
  findUserByInteration(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<HydratedDocument<LeaderboardCacheData, {}> | undefined>;
}
const LeaderboardCacheSchema = new Schema<LeaderboardCacheData, LeaderboardCacheModel, {}>({
  data: { type: [AddressSchema], required: true },
  name: { type: String, required: true, unique: true },
  lastUpdated: Date,
});

const LeaderboardCacheModel = mongoose.model<LeaderboardCacheData, LeaderboardCacheModel>(
  "LeaderboardCache",
  LeaderboardCacheSchema,
);
export default LeaderboardCacheModel;
