import { Message, OmitPartialGroupDMChannel } from "discord.js";

export function regexHandler(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  // Implement regex handler here
  console.log(message.content);
}