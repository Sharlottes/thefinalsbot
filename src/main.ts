import dotenv from "dotenv";
import "reflect-metadata";
import {} from "./express";

import { Client, DIService, tsyringeDependencyRegistryEngine } from "discordx";
import { container, instanceCachingFactory } from "tsyringe";
import { dirname, importx } from "@discordx/importer";
import * as Discord from "discord.js";
import Vars from "./Vars";
import MatchMaker from "./discord/features/MatchMaker";
import RoomsMakerService from "./discord/features/roommake/RoomsMakerService";
import FixedMessageRegister from "./core/FixedMessageRegister";
import mongoose from "mongoose";
import ServerSettingManager from "./core/ServerSettingManager";
import TFLeaderboard from "./core/TFLeaderboard";

process
  .on("unhandledRejection", (err) => {
    console.error(`[${new Date().toISOString()}] Unhandled Promise Rejection:\n`, err);
  })
  .on("uncaughtException", (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Promise Exception:\n`, err);
  })
  .on("uncaughtExceptionMonitor", (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Promise Exception (Monitor):\n`, err);
  });
dotenv.config();

DIService.engine = tsyringeDependencyRegistryEngine
  .setCashingSingletonFactory(instanceCachingFactory)
  .setInjector(container);
export const client = new Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Discord.Partials.Message, Discord.Partials.Channel, Discord.Partials.Reaction],
  botGuilds: [process.env.TEST_GUILD_ID],
});

console.time("importing...");
await importx(
  `${dirname(import.meta.url)}/core/**/*.{ts,js}`,
  `${dirname(import.meta.url)}/discord/{features,commands}/**/*.{ts,tsx,js}`,
);
console.timeEnd("importing...");

// login discord -> connect db -> init vars -> init cores -> init features
console.time("bot login...");
await client.login(process.env.TOKEN);
console.timeEnd("bot login...");
console.time("connected to db");
await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
console.timeEnd("connected to db");
TFLeaderboard.main.init();
console.time("init vars");
await Vars.init(client);
console.timeEnd("init vars");
console.time("init server setting");
await ServerSettingManager.main.init(client);
console.timeEnd("init server setting");
console.time("init server setting vars");
await Vars.initServerSetting(client);
console.timeEnd("init server setting vars");
await FixedMessageRegister.main.init();
await Promise.all([MatchMaker.main.init(), RoomsMakerService.main.init()]);
