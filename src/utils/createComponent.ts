import { ButtonStyle, ButtonBuilder, ActionRowBuilder } from "discord.js";

type Format =
  `${"_" | ""}#${string}${`.${keyof typeof ButtonStyle}` | ""}${`[${string}]` | ""}|${`:${string}:` | ""}${string}`;
const componentRegex =
  /(?:(?<isDisabled>_))?#(?<id>\w+)(?:\.(?<style>\w+))?(?:\[(?<link>\w+)\])?\|(?:\:(?<emoji>.*)\:)?(?<content>.+)/;

export default function createComponent(format: Format) {
  const match = componentRegex.exec(format);
  if (!match || !match.groups) throw new Error("Invalid format: " + format);
  const { isDisabled, id, style, link, emoji, content } = match.groups;
  const builder = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(content)
    .setDisabled(!!isDisabled)
    .setStyle(ButtonStyle[(style as keyof typeof ButtonStyle) ?? "Primary"]);

  if (link) builder.setURL(link);
  if (emoji) builder.setEmoji(emoji);

  return builder;
}
export function createComponents(...formatsList: (Discord.ActionRowBuilder | Format[])[]): Discord.ActionRowBuilder[] {
  return formatsList.map((formats) =>
    Array.isArray(formats)
      ? new ActionRowBuilder<ButtonBuilder>().addComponents(formats.map(createComponent))
      : formats,
  );
}
