import Vars from "@/Vars";
import { InputOptions } from "./InputMessageManager";

export abstract class PrimitiveInputResolver<PT extends PrimitiveInputType> {
  constructor() {}

  abstract getDescription(): string;
  abstract getTypeString(): string;
  abstract getValueString(value: PT): string;
  // * can fail to resolve or takes time to resolve
  abstract resolveInput(
    msg: Discord.Message,
  ): MaybePromise<PT | null | undefined>;
  getValidate(): NonNullable<InputOptions<PT>["textValidators"]>[number] {
    return { callback: () => true, invalidMessage: "" };
  }
}

export class TextInputResolver extends PrimitiveInputResolver<string> {
  override getDescription(): string {
    return "텍스트를 입력하세요.";
  }

  override getTypeString() {
    return "문자";
  }

  override getValueString(value: string): string {
    return value;
  }

  override resolveInput(msg: Discord.Message) {
    return msg.content;
  }
}

export class ChannelInputResolver extends PrimitiveInputResolver<Discord.Channel> {
  override getDescription(): string {
    return "채널을 멘션하거나 채널 id를 입력하세요.";
  }

  override getTypeString() {
    return "채널";
  }

  override getValueString(value: Discord.Channel): string {
    return `<#${value.id}>`;
  }

  override async resolveInput(msg: Discord.Message) {
    const channelId = msg.mentions.channels.firstKey() ?? msg.content;
    if (!channelId || !/^\d{17,19}$/.test(channelId)) return null;
    return await Vars.mainGuild.channels.fetch(channelId);
  }

  override getValidate(): NonNullable<
    InputOptions<Discord.Channel>["textValidators"]
  >[number] {
    return {
      callback: (value) =>
        /^<#\d{17,19}>$/.test(value) || /^\d{17,19}$/.test(value),
      invalidMessage:
        "입력값은 17자리 또는 19자리 숫자인 채널 ID거나 채녈 멘션이여야 합니다.",
    };
  }
}

export class CategoryInputResolver extends PrimitiveInputResolver<Discord.CategoryChannel> {
  override getDescription(): string {
    return "카테고리 id를 입력하세요.";
  }

  override getTypeString() {
    return "카테고리";
  }

  override getValueString(value: Discord.CategoryChannel): string {
    return value.name;
  }

  override async resolveInput(msg: Discord.Message) {
    const categoryId = msg.mentions.channels.firstKey() ?? msg.content;
    if (!categoryId || !/^\d{17,19}$/.test(categoryId)) return null;
    return (await Vars.mainGuild.channels.fetch(
      categoryId,
    )) as Discord.CategoryChannel;
  }
}

export class GuildPreviewInputResolver extends PrimitiveInputResolver<Discord.GuildPreview> {
  override getDescription(): string {
    return "서버 id를 입력하세요.";
  }

  override getTypeString() {
    return "서버";
  }

  override getValueString(value: Discord.GuildPreview): string {
    return value.name;
  }

  override async resolveInput(msg: Discord.Message) {
    const guildId = msg.mentions.channels.firstKey() ?? msg.content;

    if (!guildId || !/^\d{17,19}$/.test(guildId)) return null;
    return await Vars.client.fetchGuildPreview(guildId);
  }
}

export type PrimitiveInputType =
  | string
  | Discord.Channel
  | Discord.CategoryChannel
  | Discord.GuildPreview;
export const InputResolvers = {
  text: new TextInputResolver(),
  channel: new ChannelInputResolver(),
  category: new CategoryInputResolver(),
  guild: new GuildPreviewInputResolver(),
};
