import { Discord, On } from "discordx";

interface FixedMessageData {
  channel: Discord.TextBasedChannel;
}

@Discord()
export default class FixedMessageRegister {
  private static messageData: FixedMessageData[] = [];

  public static async sendMessage(
    channel: Discord.TextBasedChannel,
    messageOptions:
      | string
      | Discord.MessagePayload
      | Discord.MessageCreateOptions,
  ) {
    this.messageData.push({ channel });
    return await channel.send(messageOptions);
  }

  @On({ event: "messageCreate" })
  async onMessageCreate([message]: DiscordX.ArgsOf<"messageCreate">) {
    for (const { channel } of FixedMessageRegister.messageData) {
      if (channel.id === message.channel.id) {
        message.delete();
      }
    }
  }
}
