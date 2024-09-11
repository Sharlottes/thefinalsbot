import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import Discord, { inlineCode } from "discord.js";

declare global {
  interface UserData {
    discordId: string;
    battleTag: string;
    profile: Profile;
  }
}
interface UserModel extends Model<UserData, {}, {}> {
  findUserByInteration(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<HydratedDocument<UserData, {}> | undefined>;
}
const userSchema = new Schema<UserData, UserModel, {}>(
  {
    discordId: String,
    battleTag: String,
    profile: {
      nickname: String,
      clanname: { type: String, required: false },
      position: { type: String, required: false },
      ability: { type: String, required: false },
      weapon: { type: String, required: false },
      gadget: { type: [String], required: false, default: [] },
      preferPlaying: { type: [String], required: false, default: [] },
      preferUser: { type: [String], required: false, default: [] },
      preferPlayTime: { type: [String], required: false, default: [] },
      preferInterest: { type: [String], required: false, default: [] },
    },
  },
  {
    statics: {
      async findUserByInteration(interaction: Discord.ChatInputCommandInteraction) {
        const user = await this.findOne({
          discordId: interaction.user.id,
        });
        if (!user) {
          interaction.reply(`가입 명령어로 계정을 인증해야 ${inlineCode("/프로필 등록")} 명령어를 사용할 수 있어요.`);
          return;
        }
        return user;
      },
    },
  },
);

const UserModel = mongoose.model<UserData, UserModel>("User", userSchema);
export default UserModel;
