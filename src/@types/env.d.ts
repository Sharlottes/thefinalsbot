interface Env {
  TOKEN: string;
  TEST_GUILD_ID: string;
  DM_LOG_CHANNEL_ID: string;
  MASTER_USERS: string;
  NODE_ENV: "production" | "development";
  MONGO_URL: string;
}
