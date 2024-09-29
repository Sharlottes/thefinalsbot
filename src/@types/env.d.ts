interface Env {
  TOKEN: string;
  TEST_GUILD_ID: string;
  MASTER_USERS: string;
  MONGO_URL: string;
  DB_NAME: string;
  // * NODE_ENV는 package.json의 scripts에 의해 정해집니다
  NODE_ENV: "development" | "production";
}
