import cors from "cors";
import express from "express";
import LeaderboardCacheModel from "./models/LeaderboardCacheModel";

const app = express();
app.use(cors({ origin: ["https://the-finals-teams-web.vercel.app", "http://localhost:5173"] }));

app.get("/", (_, res) => {
  console.log("[Express] GET /");
  res.status(200).setHeader("Content-Type", "text/plain").send("OK");
});
app.get("/lb", async (_, res) => {
  console.log("[Express] GET /lb");
  const docs = await LeaderboardCacheModel.find();
  res.status(200).setHeader("Content-Type", "application/json").send(docs);
});
app.listen(8000, () => {
  console.log("server running at http://localhost:8000");
});

export default app;
