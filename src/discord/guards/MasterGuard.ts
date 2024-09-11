import Vars from "@/Vars";
import { NotBot } from "@discordx/utilities";
import Discord from "discord.js";

const MasterGuard: DiscordX.GuardFunction<Parameters<typeof NotBot>[0]> = async (arg, client, next) => {
  const argObj = arg instanceof Array ? arg[0] : arg;

  const user =
    argObj instanceof Discord.CommandInteraction
      ? argObj.user
      : argObj instanceof Discord.MessageReaction
        ? argObj.message.author
        : argObj instanceof Discord.VoiceState
          ? argObj.member?.user
          : argObj instanceof Discord.Message
            ? argObj.author
            : argObj instanceof Discord.ButtonInteraction ||
                argObj instanceof Discord.ChannelSelectMenuInteraction ||
                argObj instanceof Discord.CommandInteraction ||
                argObj instanceof Discord.ContextMenuCommandInteraction ||
                argObj instanceof Discord.MentionableSelectMenuInteraction ||
                argObj instanceof Discord.ModalSubmitInteraction ||
                argObj instanceof Discord.RoleSelectMenuInteraction ||
                argObj instanceof Discord.StringSelectMenuInteraction ||
                argObj instanceof Discord.UserSelectMenuInteraction
              ? argObj.member?.user
              : argObj.message.author;

  if (!user) return;
  if (Vars.masterUsers.find((u) => u.id == user.id)) {
    await next();
  }
};

export default MasterGuard;
