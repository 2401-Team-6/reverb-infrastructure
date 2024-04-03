import { config } from "dotenv";
config();

export const FUNCTIONS_URI =
  process.env.FUNCTIONS_SERVER_IMAGE || "quasari/dummy";
export const WORKERS_URI =
  process.env.WORKERS_SERVER_IMAGE || "quasari/workers";
