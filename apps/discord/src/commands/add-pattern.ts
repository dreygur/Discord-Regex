import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("add-pattern")
    .setDescription("Allows to add a regex pattern for webhook")
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("pattern")
      .setDescription("The regex pattern to add")
    )
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("webhook")
      .setDescription("The webhook to send notifications")
      .setAutocomplete(true)
    )
  ,
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply("Pong!");
  },
}

export { command };