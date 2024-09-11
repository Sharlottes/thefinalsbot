import { ActivityType } from "discord.js";
import { DIService, Discord, On, Once } from "discordx";

@Discord()
export default class BotInitalizer {
  @Once({ event: "ready" })
  private async ready(
    _: DiscordX.ArgsOf<"ready">,
    client: DiscordX.Client,
  ): Promise<void> {
    console.time("Initializing BotInitalizer...");

    DIService.engine.getAllServices();
    await client.initApplicationCommands();
    if ((client.application?.commands.cache.size ?? 0) > 0) {
      client.application?.commands.set([]);
    }
    client.user?.setPresence({
      status: "online",
      activities: [{ name: "/프로필 등록,확인", type: ActivityType.Custom }],
    });

    console.log(
      `Commands are all registered, total: ${client.applicationCommands.length}`,
    );
    console.log(`Bot ${client.user?.tag} ready`);
    console.timeEnd("Initializing BotInitalizer...");
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

    client.executeInteraction(interaction);
  }

  @On({ event: "messageCreate" })
  private async messageCreate(
    [message]: DiscordX.ArgsOf<"messageCreate">,
    client: DiscordX.Client,
  ) {
    if (!client.user) {
      throw new Error("client.user does not exist when message is created.");
    }

    client.executeCommand(message);
  }
}
