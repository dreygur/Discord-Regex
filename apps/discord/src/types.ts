import type { CommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface QueueTask {
  url: URL;
  init: RequestInit;
  retriesLeft: number;
  delay: number;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export type CacheOptions = {
  defaultTtl?: number | null;
};

export interface IRegexGuild {
  serverId: string;
  regexPattern: string;
  webhookName: string
};

export interface IWebhook {
  name: string;
  url: string;
  serverId: string;
  data: string;
};

export interface IServer {
  serverId: string;
  name: string;
  status: "active" | "disabled";
  totalUsers: number;
  email?: string;
}