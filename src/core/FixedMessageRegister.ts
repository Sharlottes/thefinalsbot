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
  type: "remove" | "keep";
}

@Discord()
export default class FixedMessageRegister {
  private static messageData: FixedMessageData[] = [];

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
    type: FixedMessageData["type"] = "remove",
  ) {
    await FixedMessageModel.updateOne(
      { guildId: channel.guild.id },
      { $addToSet: { channels: channel.id } },
      { upsert: true },
    );
    const message = await channel.send(messageOptions);
    this.messageData.push({
      channel,
      messageOptions,
      currentMessage: message,
      type,
    });
    return message;
  }

  @On({ event: "messageCreate" })
  async onMessageCreate([message]: DiscordX.ArgsOf<"messageCreate">) {
    for (const data of FixedMessageRegister.messageData) {
      if (data.channel.id !== message.channel.id || message.author.bot)
        continue;

      if (data.type === "remove") {
        await message.delete();
      } else {
        await data.currentMessage.delete();
        data.currentMessage = await data.channel.send(data.messageOptions);
      }
    }
  }
}
