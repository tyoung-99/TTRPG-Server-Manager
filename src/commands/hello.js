import { json } from "itty-router";
import {
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";

export const HELLO_COMMAND = {
  data: {
    name: "hello",
    description: "Test if the bot is working",
  },
  async execute(interaction, env) {
    return json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: "Hello World",
          },
        ],
      },
    });
  },
};
