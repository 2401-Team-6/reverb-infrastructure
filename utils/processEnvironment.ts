import { config } from 'dotenv';
config();

export const FUNCTIONS_URI =
  process.env.FUNCTION_SERVER_IMAGE || 'quasari/functions';
export const WORKERS_URI =
  process.env.WORKERS_SERVER_IMAGE || 'quasari/workers';
export const INGRESS_URI =
  process.env.INGRESS_SERVER_IMAGE || 'quasari/ingress';
