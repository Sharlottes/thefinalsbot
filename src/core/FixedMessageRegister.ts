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
    const messages = await FixedMessageModel.find();
    await Promise.all(
      messages.map((fixedMessageData) =>
        Promise.all([
          Vars.mainGuild.channels
            .fetch(fixedMessageData.channelId)
            .then((channel) =>
              (channel as Discord.TextBasedChannel).messages.fetch(
                fixedMessageData.messageId,
              ),
            )
            .then((message) => message.delete()),
          FixedMessageModel.deleteOne({
            messageId: fixedMessageData.messageId,
          }),
        ]),
      ),
    ),
      console.timeEnd("initalizing FixedMessageRegister...");
  }

  public static async sendMessage(
    channel: Discord.TextBasedChannel,
    messageOptions:
      | string
      | Discord.MessagePayload
      | Discord.BaseMessageOptions,
    type: FixedMessageData["type"] = "remove",
  ) {
    const message = await channel.send(messageOptions);
    await FixedMessageModel.create({
      messageId: message.id,
      channelId: channel.id,
    });
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
