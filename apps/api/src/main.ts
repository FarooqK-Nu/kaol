import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/ping", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "api",
  });
});

app.listen(port, () => {
  console.log(`[API] Server listening on http://localhost:${port}`);
});
