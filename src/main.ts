import dotenv from "dotenv"; //* 잘됨
import "reflect-metadata"; //* 잘됨
import {} from "./express"; //* 잘됨
import "./express"; //* 잘됨 (배포에선 안됨 <- ????)

import { Client, DIService, tsyringeDependencyRegistryEngine } from "discordx";
import { container, instanceCachingFactory } from "tsyringe";
import { dirname, importx } from "@discordx/importer";
import * as Discord from "discord.js";
dotenv.config();

DIService.engine = tsyringeDependencyRegistryEngine
  .setCashingSingletonFactory(instanceCachingFactory)
  .setInjector(container);
const client = new Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Discord.Partials.Message,
    Discord.Partials.Channel,
    Discord.Partials.Reaction,
  ],
  botGuilds:
    process.env.NODE_ENV == "development"
      ? [process.env.TEST_GUILD_ID]
      : undefined,
});

await importx(
  `${dirname(import.meta.url)}/{events,command,models}/**/*.{ts,js}`,
);

client.login(process.env.TOKEN);

process
  .on("unhandledRejection", (err) => {
    console.error(
      `[${new Date().toISOString()}] Unhandled Promise Rejection:\n`,
      err,
    );
  })
  .on("uncaughtException", (err) => {
    console.error(
      `[${new Date().toISOString()}] Uncaught Promise Exception:\n`,
      err,
    );
  })
  .on("uncaughtExceptionMonitor", (err) => {
    console.error(
      `[${new Date().toISOString()}] Uncaught Promise Exception (Monitor):\n`,
      err,
    );
  });
