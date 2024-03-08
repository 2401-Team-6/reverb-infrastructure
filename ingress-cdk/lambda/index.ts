import { APIGatewayProxyHandler } from "aws-lambda";
import { Client } from "pg";
import * as AWS from "aws-sdk";
const secretsManager = new AWS.SecretsManager();

export const handler: APIGatewayProxyHandler = async event => {
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

  const eventBody = JSON.parse(event.body);

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
      [eventBody]
    );
    // await client.query(
    //   "CREATE TABLE IF NOT EXISTS events (id serial PRIMARY KEY, name varchar(30) UNIQUE NOT NULL);"
    // );
    // await client.query(`INSERT INTO events (name) VALUES ($1);`, [
    //   eventBody.name,
    // ]);
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
