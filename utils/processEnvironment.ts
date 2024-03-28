import { config } from "dotenv";
config();

if (!process.env.FUNCTIONS_SERVER_IMAGE) {
  throw new Error(
    "Please provide your function server image repo in an environmental variable: FUNCTION_SERVER_IMAGE"
  );
}

export const FUNCTIONS_URI =
  process.env.FUNCTIONS_SERVER_IMAGE || "quasari/dummy";
export const WORKERS_URI =
  process.env.WORKERS_SERVER_IMAGE || "quasari/workers";
