import dotenv from "dotenv";
import process from "node:process";
import { SUMMARY_COMMAND } from "./commands/summary.js";

const commands = JSON.stringify([SUMMARY_COMMAND.data]);

dotenv.config({ path: ".env" });
const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;

if (!token) {
  throw new Error("DISCORD_TOKEN environment variable is not set");
}
if (!appId) {
  throw new Error("DISCORD_APPLICATION_ID environment variable is not set");
}

const registerUrl = `https://discord.com/api/v10/applications/${appId}/commands`;

const res = await fetch(registerUrl, {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bot ${token}`,
  },
  method: "PUT",
  body: commands,
});

if (res.ok) {
  console.log("Successfully registered all commands");
  const data = await res.json();
  console.log(data);
} else {
  console.error("Error registering commands");
  let errorText = `Error registering commands \n ${res.url}: ${res.status}  ${res.statusText}`;
  try {
    const error = await res.text();
    if (error) {
      errorText = `${errorText} \n\n ${error}`;
    }
  } catch (e) {
    console.error("Error reading body from request:", e);
  }
  console.error(errorText);
}
