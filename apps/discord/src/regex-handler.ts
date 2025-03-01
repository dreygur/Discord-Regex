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
  totalChannels: number;
}

// The fetch Queue
export const queue = new FetchQueue();

// Cache
export const cache = new Cache<any>({ defaultTtl: 10000 });

// Cache All the webhooks
export async function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  // Implement regex handler here
  console.log(message.content);

  if (message.content.length === 0) return;

  var patterns: IRegexGuild[] | undefined = cache.get(message.guildId as string);
  var webhooks: IWebhook[] | undefined = cache.get('webhooks');
  var servers: IServer | undefined = cache.get(`${message.guildId}_server`);
  if (!patterns) {
    patterns = await database.getRegexesByServer(message.guildId as string);
    cache.set(message.guildId as string, patterns);
  }

  if (!webhooks) {
    webhooks = await database.getAllWebhooks();
    cache.set('webhooks', webhooks);
  }

  if (!servers) {
    const server = await database.getServer(message.guildId as string);
    if (server) cache.set(`${message.guildId}_server`, servers);
  }

  if (!patterns || !servers || servers.status === 'disabled') return;

  patterns.forEach(pattern => {
    // Check if the regex pattern matches message.content
    if (!(new RegExp(pattern.regexPattern).test(message.content)) || !webhooks) return;
    const webhook = webhooks.find(w => w.name === pattern.webhookName);
    if (webhook) {
      queue.add(new URL(webhook.url), {
        method: 'POST',
        body: JSON.stringify({ content: message.content }),
        headers: { 'Content-Type': 'application/json' }
      })
        .then(response => {
          console.log('POST successful:', response.status);
          return response.json();
        })
        .then(console.log)
        .catch(console.error)
    }
  });

  /*
  // Standard GET request with default retries and delay
  queue.add('https://api.example.com/data')
    .then(response => response.json())
    .catch(error => console.error('Final error:', error));

  // POST request with custom retries and delay
  queue.add(
    'https://api.example.com/other-data',
    {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' }
    },
    5,  // retries
    2000 // delay
  ).then(response => {
    console.log('POST successful:', response.status);
  });
  */
}