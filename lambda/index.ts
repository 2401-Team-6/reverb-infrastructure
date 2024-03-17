import { Handler } from "aws-lambda";
import { Client } from "pg";
import { v4 as uuidv4 } from "uuid";
import * as AWS from "aws-sdk";
const secretsManager = new AWS.SecretsManager();

export const handler: Handler = async event => {
  if (
    !event.body ||
    typeof event.body !== "string" ||
    JSON.parse(event.body).name === undefined
  ) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Invalid event request.",
    };
  }

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

  const eventPayload = JSON.parse(event.body);
  const eventId = uuidv4();
  eventPayload.id = eventId;

  const client = new Client({
    host: process.env.RDS_PROXY_URL,
    port: process.env.RDS_PORT ? +process.env.RDS_PORT : 5432,
    database: process.env.DB_NAME,
    user: secretValue.username,
    password: secretValue.password,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    await client.query(
      `SELECT graphile_worker.add_job('process_event', $1,'event_processing_queue');`,
      [eventPayload]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "Event processed.",
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Error processing event.",
    };
  } finally {
    client.end();
  }
};
