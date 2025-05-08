import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { queue } from './queue';
import { database } from "./database";
import { cache } from "./cache";
import type { IRegexGuild, IServer, IWebhook } from "./types";

function parseRegex(input: any, defaultFlags: string = "") {
  if (input instanceof RegExp) return input; // Already a RegExp

  if (typeof input !== "string") {
    throw new Error("Regex must be a string or RegExp");
  }

  const isWrapped = input.startsWith("/") && input.lastIndexOf("/") > 0;

  if (isWrapped) {
    // Extract pattern and flags from `/pattern/flags`
    const lastSlash = input.lastIndexOf("/");
    const pattern = input.slice(1, lastSlash);
    const flags = input.slice(lastSlash + 1);
    return new RegExp(pattern, flags);
  } else {
    // Just a raw pattern, use default flags
    return new RegExp(input, defaultFlags);
  }
}


// Cache All the webhooks
export async function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  if (message.content.length === 0) return;

  const guildCacheKey: string = message.guildId as string;
  const guildCache = cache.get(guildCacheKey);

  let patterns: IRegexGuild[] | undefined = guildCache?.patterns;
  let webhooks: IWebhook[] | undefined = guildCache?.webhooks;
  let servers: IServer | undefined = guildCache?.servers;

  if (!patterns) {
    patterns = await database.getRegexesByServer(message.guildId as string);
    cache.set(guildCacheKey, { patterns });
  }

  if (!webhooks) {
    webhooks = await database.getAllWebhooksByServerId(message.guildId as string);
    cache.set(guildCacheKey, { webhooks });
  }

  if (!servers) {
    servers = (await database.getServer(message.guildId as string)) as IServer;
    cache.set(guildCacheKey, { servers });
  }

  if (!patterns || !servers || servers.status === 'disabled') return;

  patterns.forEach(pattern => {
    try {
      // Check if the regex pattern matches message.content
      // if (!(new RegExp(pattern.regexPattern).test(message.content)) || !webhooks) return;
      if (!(parseRegex(pattern.regexPattern).test(message.content)) || !webhooks) return;
    } catch (errr) {
      console.log(errr);
      return;
    }
    const webhook = webhooks.find(w => w.name === pattern.webhookName);
    if (webhook) {
      console.log('Sending message to webhook:', webhook.url);
      queue.add(new URL(webhook.url), {
        method: 'POST',
        body: JSON.stringify({ content: message.content }),
        headers: { 'Content-Type': 'application/json' }
      })
        .then(response => {
          console.log('POST successful:', response.status);
          return response.status;
        })
        .catch(console.log)
    }
  });
}