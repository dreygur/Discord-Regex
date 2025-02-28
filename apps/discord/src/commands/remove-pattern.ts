import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("remove-pattern")
    .setDescription("Allows to remove a regex pattern")
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("pattern")
      .setDescription("The regex pattern to remove")
    ),
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply("Pong!");
  },
}

export { command };