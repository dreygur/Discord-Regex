import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { queue } from './queue';
import { database } from "./database";
import { cache } from "./cache";
import { debug } from "./debug";
import { parseRegex } from "./regex-engine";
import { sanitizeInput, escapeForJSON } from "./sanitize";
import type { IRegexGuild, IServer, IWebhook } from "./types";


// Cache All the webhooks
export async function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  try {
    if (message.content.length === 0) return;

    // Debug: Log incoming message details
    debug.log('\n=== MESSAGE RECEIVED ===');
    debug.log('Guild ID:', message.guildId);
    debug.log('User ID:', message.author.id);
    debug.log('Username:', message.author.username);
    debug.log('Message:', message.content);
    debug.log('========================');

    const guildCacheKey: string = message.guildId as string;
    const guildCache = cache.get(guildCacheKey);

    // Check server status first to avoid unnecessary database calls
    let servers: IServer | undefined = guildCache?.servers;
    if (!servers) {
      servers = (await database.getServer(message.guildId as string)) as IServer;
      cache.set(guildCacheKey, { servers });
    }

    // Early return if server is disabled - saves expensive pattern/webhook queries
    if (!servers || servers.status === 'disabled') return;

    // Only fetch patterns and webhooks if server is active
    let patterns: IRegexGuild[] | undefined = guildCache?.patterns;
    let webhooks: IWebhook[] | undefined = guildCache?.webhooks;

    if (!patterns) {
      patterns = await database.getRegexesByServer(message.guildId as string);
      cache.set(guildCacheKey, { patterns });
    }

    if (!webhooks) {
      webhooks = await database.getAllWebhooksByServerId(message.guildId as string);
      cache.set(guildCacheKey, { webhooks });
    }

    if (!patterns) return;

    patterns.forEach(pattern => {
      try {
        debug.log('\n--- Testing Pattern ---');
        debug.log('Pattern:', pattern.regexPattern);
        debug.log('Webhook:', pattern.webhookName);
        debug.log('Allowed Users:', pattern.user_ids);
        
        // Check if the regex pattern matches message.content
        const regexMatch = parseRegex(pattern.regexPattern).test(message.content);
        debug.log('Regex Match:', regexMatch);
        
        if (!regexMatch || !webhooks) {
          debug.log('[REJECTED] Pattern rejected: No regex match or no webhooks');
          return;
        }
        
        // Optional user filtering - skip if 'All' or check specific user IDs
        if (pattern.user_ids && pattern.user_ids.length > 0 && !pattern.user_ids.includes('All')) {
          const userAllowed = pattern.user_ids.includes(message.author.id);
          debug.log('User Filter Active:', true);
          debug.log('User Allowed:', userAllowed);
          if (!userAllowed) {
            debug.log('[REJECTED] Pattern rejected: User not in allowed list');
            return;
          }
        } else {
          debug.log('User Filter:', 'All users allowed');
        }
        
        debug.log('[MATCHED] Pattern matched! Processing webhook...');
      } catch (errr) {
        debug.error('[ERROR] Pattern error:', errr);
        return;
      }
      const webhook = webhooks.find(w => w.name === pattern.webhookName);
      if (webhook) {
        debug.log('Sending message to webhook:', webhook.url);
        
        // Sanitize message content before including in webhook payload
        const sanitizedContent = sanitizeInput(message.content);
        
        let body = JSON.stringify({ content: sanitizedContent });
        if (webhook.data) {
          let data = '';
          if (typeof webhook.data === 'object') {
            data = JSON.stringify(webhook.data);
          } else if (typeof webhook.data === 'string') {
            data = webhook.data;
          }
          // Escape content for safe JSON substitution
          const escapedContent = escapeForJSON(sanitizedContent);
          body = data.replace(/\$content\$/g, escapedContent);
        }
        queue.add(new URL(webhook.url), {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' }
        })
          .then(response => {
            debug.log('POST successful:', response.status);
            return response.status;
          })
          .catch(debug.error)
      }
    });
  } catch (error) {
    // Log error and continue processing - don't crash the handler
    debug.error('[ERROR] Message processing error:', error);
  }
}