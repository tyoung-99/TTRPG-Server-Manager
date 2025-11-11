import { AutoRouter, error, json } from "itty-router";
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { HELLO_COMMAND } from "./commands/hello.js";

const commands = [HELLO_COMMAND];
const router = AutoRouter();

router.post("/interactions", async (req, env) => {
  try {
    const { interaction, isValid } = await verifyDiscordRequest(req, env);
    if (!isValid || !interaction) {
      return error(401, "Invalid request signature");
    }

    if (interaction.type === InteractionType.PING) {
      return json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data.name;

      for (const cmd of commands) {
        if (cmd.data.name === commandName) {
          return await cmd.execute(interaction, env);
        }
      }

      return error(400, "Unknown command");
    }

    return error(400, "Unknown interaction type");
  } catch (e) {
    console.error("Unhandled error in /interactions", e);
    return error(500, "Internal Server Error");
  }
});

router.all("*", () => error(404, "Not Found"));

async function verifyDiscordRequest(req, env) {
  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  const body = await req.text();

  try {
    const isValidRequest =
      signature &&
      timestamp &&
      (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));

    return { interaction: JSON.parse(body), isValid: isValidRequest };
  } catch (e) {
    return { interaction: null, isValid: false };
  }
}

const server = {
  fetch: router.fetch,
};

export default server;
