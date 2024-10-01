import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

interface LeaderboardCacheData {
  data: {
    point: number;
    leagueId: number;
    rank: number;
    updatedAt: Date;
  }[];
  name: string;
}

const AddressSchema = new Schema({
  point: Number,
  leagueId: Number,
  rank: Number,
  updatedAt: Date,
});

interface LeaderboardCacheModel extends Model<LeaderboardCacheData, {}, {}> {
  findUserByInteration(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<HydratedDocument<LeaderboardCacheData, {}> | undefined>;
}
const LeaderboardCacheSchema = new Schema<LeaderboardCacheData, LeaderboardCacheModel, {}>({
  data: { type: [AddressSchema], required: true },
  name: { type: String, required: true, unique: true },
});

const LeaderboardCacheModel = mongoose.model<LeaderboardCacheData, LeaderboardCacheModel>(
  "LeaderboardCache",
  LeaderboardCacheSchema,
);
export default LeaderboardCacheModel;
