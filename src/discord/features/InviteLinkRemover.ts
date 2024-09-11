import Vars from "@/Vars";
import { Discord, On } from "discordx";

@Discord()
export default class InviteLinkRemover {
  @On({ event: "messageCreate" })
  private async messageCreate([message]: DiscordX.ArgsOf<"messageCreate">, client: DiscordX.Client) {
    const matchArr = message.content.match(/discord.gg\/([A-Za-z0-9]+)/);
    if (!matchArr) return;
    const inviteCode = matchArr[1];
    const result = (await client.rest.get(`/invites/${inviteCode}`, {})) as any;
    if (Vars.banInviteGuilds.includes(result.guild.id)) {
      message.delete();
    }
  }
}
