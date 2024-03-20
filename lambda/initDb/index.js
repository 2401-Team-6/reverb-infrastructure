const { Client } = require("pg");
const AWS = require("aws-sdk");
const crypto = require("crypto");
const secrets = new AWS.SecretsManager();

exports.handler = async (event) => {
  console.log("Custom::DBInitializer event", event);
  switch (event.RequestType) {
    case "Create":
      return createEvent(event);
    case "Update":
      return updateEvent(event);
    case "Delete":
      return deleteEvent();
    default:
      console.log(`Request type ${requestType} is not supported`);
      break;
  }
};

async function createEvent(event) {
  const response = getReponseObj(event);
  const { config } = event.ResourceProperties;
  const { password, username, host, port } = await getSecretValue(
    config.credsSecretName
  );
  const connection = new Client({
    ssl: {
      rejectUnauthorized: false, // don't do this
    },
    host,
    user: username,
    password,
    port,
    database: "graphile",
  });

  try {
    await connection.connect();
    await connection.query(
      "CREATE TABLE events (id serial PRIMARY KEY, name varchar(30) UNIQUE NOT NULL)"
    );
    await connection.query(
      "CREATE TABLE functions (id serial PRIMARY KEY, name varchar(30) UNIQUE NOT NULL, event_id integer REFERENCES events(id) ON DELETE CASCADE)"
    );
    await connection.query(
      "CREATE TABLE hash (hash char(28) UNIQUE NOT NULL DEFAULT '')"
    );

    response.Status = "SUCCESS";
    response.Data = { Result: "Schema created" };
    console.log("SUCCESS");
    console.table(response);
    return response;
  } catch (err) {
    throw new Error(err);
  } finally {
    await (connection && connection.end());
  }
}
function updateEvent(event) {
  console.log("Custom::DBInitializer Update event");
  return {
    ...getReponseObj(event),
    Status: "SUCCESS",
    Data: { Result: "Update event Skipped" },
  };
}

function deleteEvent() {
  return {
    Status: "SUCCESS",
    Data: { Result: "Delete event Skipped, nothing to delete" },
  };
}
function getSecretValue(secretId) {
  return new Promise((resolve, reject) => {
    secrets.getSecretValue({ SecretId: secretId }, (err, data) => {
      if (err) return reject(err);
      return resolve(JSON.parse(data.SecretString));
    });
  });
}
function getId(event) {
  return crypto
    .createHash("md5")
    .update(`${event.StackId}-${event.LogicalResourceId}`)
    .digest("hex")
    .substring(0, 7);
}
function getReponseObj(event) {
  return {
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: event.PhysicalResourceId ?? getId(event),
  };
}
