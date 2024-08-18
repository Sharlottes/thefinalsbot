import ErrorMessageManager from "@/discord/messageManagers/ErrorMessageManager";
import { ApplicationCommandOptionType } from "discord.js";
import autoDeleteMessage from "./autoDeleteMessage";

type OptionValueMap = {
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.User]: Discord.User;
  [ApplicationCommandOptionType.Channel]: Discord.GuildBasedChannel;
  [ApplicationCommandOptionType.Role]: Discord.Role;
  [ApplicationCommandOptionType.Mentionable]:
    | Discord.GuildMember
    | Discord.User
    | Discord.Role;
  [ApplicationCommandOptionType.Number]: number;
  [ApplicationCommandOptionType.Attachment]: Discord.Attachment;
};

export default class SlashOptionBuilder<T extends string, TD extends string> {
  public static create<
    T extends string,
    TD extends string,
    OT extends Exclude<
      ApplicationCommandOptionType,
      | ApplicationCommandOptionType.Subcommand
      | ApplicationCommandOptionType.SubcommandGroup
    >,
  >(
    options: Omit<
      DiscordX.SlashOptionOptions<
        DiscordX.VerifyName<T>,
        DiscordX.NotEmpty<TD>
      >,
      "type" | "required"
    > & {
      type: OT;
      validators?: Array<
        [
          validator: (
            value:
              | ((typeof options)["required"] extends false ? null : never)
              | OptionValueMap[OT],
          ) => boolean,
          error: string,
        ]
      >;
    } & (
        | { required: true }
        | { required?: false; default?: OptionValueMap[OT] }
      ),
  ): DiscordX.SlashOptionOptions<
    DiscordX.VerifyName<T>,
    DiscordX.NotEmpty<TD>
  > {
    options.transformer = async (
      value: OptionValueMap[OT],
      interaction: Discord.ChatInputCommandInteraction,
    ): Promise<OptionValueMap[OT] | undefined> => {
      if (options.validators) {
        let errorMsg = "";
        for (const [validator, error] of options.validators) {
          if (!validator(value)) {
            errorMsg += error;
          }
        }

        if (errorMsg) {
          await autoDeleteMessage(
            new ErrorMessageManager.Builder()
              .send("interaction", interaction, {
                description: errorMsg,
              })
              .then((m) => m.message),
          );
          return undefined;
        }
      }

      if (!options.required && options.default) value ??= options.default;

      return value;
    };
    return options as any;
  }
}
