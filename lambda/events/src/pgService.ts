import { Client } from "pg";
import * as AWS from "aws-sdk";
import { Event } from "./types";

const secretsManager = new AWS.SecretsManager();

const createClient = async () => {
  const secretArn = process.env.RDS_SECRET_ARN;
  let secretValue;
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretArn || "" })
      .promise();
    secretValue = JSON.parse(data.SecretString || "");
    if (!secretValue) {
      throw new Error("Error retrieving secret.");
    }
  } catch (err) {
    console.log(err);
    throw err as Error;
  }

  return new Client({
    host: process.env.RDS_PROXY_URL,
    port: process.env.RDS_PORT ? +process.env.RDS_PORT : 5432,
    database: process.env.DB_NAME,
    user: secretValue.username,
    password: secretValue.password,
    ssl: {
      rejectUnauthorized: false,
    },
  });
};

export const addEvent = async (eventPayload: Event) => {
  const client = await createClient();
  try {
    await client.connect();

    await client.query(
      `SELECT graphile_worker.add_job('process_event', $1,'event_processing_queue');`,
      [eventPayload]
    );
  } finally {
    client.end();
  }
};
