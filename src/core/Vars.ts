import { Discord, On } from "discordx";

@Discord()
export default class Vars {
  static client: DiscordX.Client;
  static mainGuild: Discord.Guild;

  @On({ event: "ready" })
  async onReady(
    _: DiscordX.ArgsOf<"ready">,
    client: DiscordX.Client,
  ): Promise<void> {
    Vars.client = client;
    Vars.mainGuild = await client.guilds.fetch(process.env.TEST_GUILD_ID);
  }
}
