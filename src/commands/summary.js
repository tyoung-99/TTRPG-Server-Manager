import { json } from "itty-router";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

const DISCORD_API = "https://discord.com/api/v10";
const MODAL_ID = "summary_modal";
const MODAL_TEXT_ID = "summary_text";
const SUMMARY_HEADER = "**CHANNEL SUMMARY**\n";
const SPACER = "------------------------------------------------\n";

export const SUMMARY_COMMAND = {
  data: {
    name: "summary",
    description: "Create or edit this channel's pinned summary message",
  },
  modalId: MODAL_ID,

  /**
   * Handles the /summary command execution
   * @param {Object} interaction Discord interaction object
   * @param {Object} env Environment variables
   * @returns JSON response for Discord to display a modal
   */
  async execute(interaction, env) {
    const token = env.DISCORD_TOKEN;
    const message = await getSummaryMessage(
      interaction.channel_id,
      token,
      env.DISCORD_APPLICATION_ID
    );
    const summaryText = message
      ? message.content.slice(SUMMARY_HEADER.length + SPACER.length)
      : "";

    return json({
      type: InteractionResponseType.MODAL,
      data: {
        custom_id: MODAL_ID,
        title: message ? "Edit Channel Summary" : "Create Channel Summary",
        components: [
          {
            type: MessageComponentTypes.LABEL,
            label: SUMMARY_HEADER,
            component: {
              type: MessageComponentTypes.INPUT_TEXT,
              custom_id: MODAL_TEXT_ID,
              style: 2,
              value: summaryText,
            },
          },
        ],
      },
    });
  },

  /**
   *  Handle the modal submission for creating or editing the summary message
   * @param {Object} interaction Discord interaction object
   * @param {Object} env Environment variables
   * @returns JSON response message for Discord, an ephemeral confirmation message
   */
  async handleModal(interaction, env) {
    const token = env.DISCORD_TOKEN;
    const summaryText = interaction.data.components.find((component) => {
      return component.component.custom_id === MODAL_TEXT_ID;
    }).component.value;

    const message = await getSummaryMessage(
      interaction.channel_id,
      token,
      env.DISCORD_APPLICATION_ID
    );

    if (!message) {
      const newMessage = await createNewMessage(
        interaction.channel_id,
        token,
        summaryText
      );
      if (!newMessage) {
        return json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              "Failed to create new summary message. Please try again later.",
          },
        });
      }
      if (!(await pinMessage(interaction.channel_id, token, newMessage.id))) {
        return json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content:
              "Created, but failed to pin, new summary message. Please pin it manually.",
          },
        });
      }

      return json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: "Created and pinned new summary message.",
        },
      });
    }

    if (
      !(await editMessage(
        interaction.channel_id,
        token,
        message.id,
        summaryText
      ))
    ) {
      return json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content:
            "Failed to edit pinned summary message. Please try again later.",
        },
      });
    }

    return json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Updated pinned summary message.",
      },
    });
  },
};

async function getSummaryMessage(channelId, token, appId) {
  const getMessagesPinsUrl = `${DISCORD_API}/channels/${channelId}/messages/pins`; // GET

  const res = await fetch(getMessagesPinsUrl, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    method: "GET",
  });

  if (!res.ok) {
    let errorText = `Error fetching messages \n ${res.url}: ${res.status}  ${res.statusText}`;
    try {
      const error = await res.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch (e) {
      console.error("Error reading body from response:", e);
    }
    console.error(errorText);
    return;
  }

  const messagePins = await res.json();
  for (const msgPin of messagePins.items) {
    if (
      msgPin.message.author.id === appId &&
      msgPin.message.content.startsWith(SUMMARY_HEADER + SPACER)
    ) {
      return msgPin.message;
    }
  }
  return null;
}

async function createNewMessage(channelId, token, summaryText) {
  const createMessageUrl = `${DISCORD_API}/channels/${channelId}/messages`; // POST

  const res = await fetch(createMessageUrl, {
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      content: SUMMARY_HEADER + SPACER + summaryText,
    }),
  });

  if (!res.ok) {
    let errorText = `Error creating message \n ${res.url}: ${res.status}  ${res.statusText}`;
    try {
      const error = await res.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch (e) {
      console.error("Error reading body from response:", e);
    }
    console.error(errorText);
    return false;
  }

  return await res.json();
}

async function editMessage(channelId, token, messageId, newSummaryText) {
  const editMessageUrl = `${DISCORD_API}/channels/${channelId}/messages/${messageId}`; // PATCH

  const res = await fetch(editMessageUrl, {
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
    body: JSON.stringify({
      content: SUMMARY_HEADER + SPACER + newSummaryText,
    }),
  });

  if (!res.ok) {
    let errorText = `Error editing message \n ${res.url}: ${res.status}  ${res.statusText}`;
    try {
      const error = await res.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch (e) {
      console.error("Error reading body from response:", e);
    }
    console.error(errorText);
    return false;
  }

  return true;
}

async function pinMessage(channelId, token, messageId) {
  const pinMessageUrl = `${DISCORD_API}/channels/${channelId}/messages/pins/${messageId}`; // PUT

  const res = await fetch(pinMessageUrl, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    method: "PUT",
  });

  if (!res.ok) {
    let errorText = `Error pinning message \n ${res.url}: ${res.status}  ${res.statusText}`;
    try {
      const error = await res.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch (e) {
      console.error("Error reading body from response:", e);
    }
    console.error(errorText);
    return false;
  }

  return true;
}
