import { DIService, Discord, On } from "discordx";
import mongoose from "mongoose";

@Discord()
export default class Event {
  @On({ event: "ready" })
  private async ready(
    _: DiscordX.ArgsOf<"ready">,
    client: DiscordX.Client,
  ): Promise<void> {
    await mongoose.connect(process.env.MONGO_URL);

    DIService.engine.getAllServices();
    await client.initApplicationCommands();

    console.log(
      `Commands are all resrc/utils/openEntryPoint.tsgistered, total: ${client.applicationCommands.length}`,
    );
    console.log(`Bot ${client.user?.tag} ready`);
  }

  @On({ event: "interactionCreate" })
  private async interactionCreate(
    [interaction]: DiscordX.ArgsOf<"interactionCreate">,
    client: DiscordX.Client,
  ) {
    if (!client.user) {
      throw new Error(
        "client.user does not exist when interaction is created.",
      );
    }
    if (client.user.presence.status == "online") {
      client.executeInteraction(interaction);
    }
  }

  @On({ event: "messageCreate" })
  private async messageCreate(
    [message]: DiscordX.ArgsOf<"messageCreate">,
    client: DiscordX.Client,
  ) {
    if (!client.user) {
      throw new Error("client.user does not exist when message is created.");
    }
    if (client.user.presence.status == "online") {
      client.executeCommand(message);
    }
  }
}
