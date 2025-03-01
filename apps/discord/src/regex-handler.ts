import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { FetchQueue } from './queue';
import { database } from "./database";

// The fetch Queue
export const queue = new FetchQueue();

// Cache All the webhooks
export async function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  // Implement regex handler here
  console.log(message.content);

  const patterns = await database.getRegexesByServer(message.guildId as string);
  // Load it conditionally if any pattern matches
  const webhooks = await database.getAllWebhooks();

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