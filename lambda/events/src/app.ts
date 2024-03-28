import express, { Request } from "express";
import { addEvent } from "./pgService";
import { v4 } from "uuid";
import { Event } from "./types";

const app = express();

app.use(express.json());

app.post("/events", async (req: Request<{}, {}, Event>, res) => {
  if (!req.body?.name) {
    return res.status(400).send({ error: "Invalid event request." });
  }

  const id = v4();
  try {
    await addEvent({ name: req.body.name, payload: req.body.payload, id });
    res.status(202).json({ message: "Event processed", id });
  } catch {
    res.status(500).json({ error: "Error processing event." });
  }
});

app.post("/webhooks", async (req, res) => {
  try {
    await addEvent({
      name: "reverb_received_webhook",
      payload: { webhook: { headers: req.headers, body: req.body } },
      id: v4(),
    });

    res.status(200).send();
  } catch {
    res.status(500).json({ error: "Error processing event." });
  }
});

export default app;
