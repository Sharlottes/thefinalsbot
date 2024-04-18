import { createServer } from "node:http";
import express from "express";
const app = express();

app.get("/", (_, res) => {
  res.status(200).setHeader("Content-Type", "text/plain").send("OK");
});

const server = createServer(express);

server.listen(8000, () => {
  console.log("server running at http://localhost:8000");
});
export default app;
