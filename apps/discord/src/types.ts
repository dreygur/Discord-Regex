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
