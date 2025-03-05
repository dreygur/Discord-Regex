import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { FetchQueue } from './queue';
import { database } from "./database";
import { Cache } from "./cache";

interface IRegexGuild {
  serverId: string;
  regexPattern: string;
  webhookName: string
};

interface IWebhook {
  name: string;
  url: string
};

interface IServer {
  serverId: string;
  name: string;
  status: "active" | "disabled";
  totalUsers: number;
}

// The fetch Queue
export const queue = new FetchQueue();

// Cache
export const cache = new Cache<any>({ defaultTtl: parseInt(process.env.CACHE_TTL as string) || 10000 });

// Cache All the webhooks
export async function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  if (message.content.length === 0) return;

  var patterns: IRegexGuild[] | undefined = cache.get(message.guildId as string);
  var webhooks: IWebhook[] | undefined = cache.get('webhooks');
  var servers: IServer | undefined = cache.get(`${message.guildId}_server`);
  if (!patterns) {
    patterns = await database.getRegexesByServer(message.guildId as string);
    cache.set(message.guildId as string, patterns);
  }

  if (!webhooks) {
    webhooks = await database.getAllWebhooksByServerId(message.guildId as string);
    cache.set('webhooks', webhooks);
  }

  if (!servers) {
    const server = await database.getServer(message.guildId as string);
    if (server) {
      cache.set(`${message.guildId}_server`, server);
      servers = server;
    }
  }

  if (!patterns || !servers || servers.status === 'disabled') return;

  patterns.forEach(pattern => {
    // Check if the regex pattern matches message.content
    if (!(new RegExp(pattern.regexPattern).test(message.content)) || !webhooks) return;
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
          return response.json();
        })
        .catch(console.log)
    }
  });
}