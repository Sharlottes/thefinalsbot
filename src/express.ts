import express from "express";
const app = express();

app.get("/", (_, res) => {
  res.status(200).setHeader("Content-Type", "text/plain").send("OK");
});

export default app;
