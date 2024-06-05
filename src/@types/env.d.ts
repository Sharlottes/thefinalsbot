interface Env {
  TOKEN: string;
  TEST_GUILD_ID: string;
  DM_LOG_CHANNEL_ID: string;
  ROOMMAKING_ANNOUNCE_CHANNELS_ID: string;
  MATCHMAKING_ANNOUNCE_CHANNEL_ID: string;
  MATCHMAKING_WAITING_CHANNEL_ID: string;
  MATCHMAKED_ROOM_CATEGORY_ID: string;
  MASTER_USERS: string;
  NODE_ENV: "production" | "development";
  MONGO_URL: string;
}
