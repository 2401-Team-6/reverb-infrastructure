import { config } from 'dotenv';
config();

export const FUNCTIONS_URI =
  process.env.FUNCTION_SERVER_IMAGE || 'quasari/functions';
export const WORKERS_URI =
  process.env.WORKERS_SERVER_IMAGE || 'quasari/workers';
export const INGRESS_URI =
  process.env.INGRESS_SERVER_IMAGE || 'quasari/ingress';
export const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD as string;
