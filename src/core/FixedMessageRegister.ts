import Vars from "@/Vars";
import FixedMessageModel from "@/models/FixedMessagesModel";
import { Discord, On } from "discordx";

interface FixedMessageData {
  channel: Discord.TextBasedChannel;
  messageOptions:
    | string
    | Discord.MessagePayload
    | Discord.MessageCreateOptions;
  currentMessage: Discord.Message;
}

@Discord()
export default class FixedMessageRegister {
  private static messageData: Record<string, Map<string, FixedMessageData>> =
    {};

  public static main: FixedMessageRegister;
  constructor() {
    FixedMessageRegister.main = this;
  }

  public async init() {
    console.time("initalizing FixedMessageRegister...");
    const allData = await FixedMessageModel.find();
    await Promise.all(
      allData.map(async (data) => {
        const guild = await Vars.client.guilds.fetch(data.guildId);
        await Promise.all(
          data.channels.map(async (channelId) => {
            const channel = await guild.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) return;
            const messages = await channel.messages.fetch();
            await Promise.all(
              messages.map((m) => {
                if (m.author == Vars.client.user) m.delete();
              }),
            );
          }),
        );
      }),
    );
    console.timeEnd("initalizing FixedMessageRegister...");
  }

  public static async sendMessage(
    channel: Discord.GuildTextBasedChannel,
    messageOptions:
      | string
      | Discord.MessagePayload
      | Discord.BaseMessageOptions,
  ) {
    await FixedMessageModel.updateOne(
      { guildId: channel.guild.id },
      { $addToSet: { channels: channel.id } },
      { upsert: true },
    );
    this.messageData[channel.id] ??= new Map();
    const message = await channel.send(messageOptions);
    this.messageData[channel.id].set(message.id, {
      channel,
      messageOptions,
      currentMessage: message,
    });
    return message;
  }

  @On({ event: "messageCreate" })
  async onMessageCreate([message]: DiscordX.ArgsOf<"messageCreate">) {
    const map = FixedMessageRegister.messageData[message.channelId];
    if (!map || map.has(message.id)) return;
    const data = map.values();
    const promises: Promise<unknown>[] = [];
    for (const d of data) {
      promises.push(
        new Promise<void>(async (res) => {
          await d.currentMessage.delete();
          d.currentMessage = await message.channel.send(d.messageOptions);
          res();
        }),
      );
    }

    await Promise.all(promises);
  }
}
