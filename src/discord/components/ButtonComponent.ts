import InteractionObserver from "@/core/InteractionObserver";
import { ButtonBuilder, ButtonStyle } from "discord.js";

export interface ButtonComponentOptions {
  onClick: (interaction: Discord.ButtonInteraction) => unknown;
  customId: string;
}
/**
 * 헨들러의 옵저빙과 customId / label 명명을 추상화한 ButtonBuilder 파생 클래스
 */
export default class ButtonComponent
  extends ButtonBuilder
  implements Interactive<"button">
{
  private readonly onClick: (interaction: Discord.ButtonInteraction) => unknown;
  private readonly options: ButtonComponentOptions;

  constructor(
    data: Partial<Discord.InteractionButtonComponentData> &
      ButtonComponentOptions,
  ) {
    super({ ...data });
    this.options = data;

    this.onClick = data.onClick;
    InteractionObserver.main.addInteractive(this);
  }

  public handleInteraction(interaction: Discord.ButtonInteraction) {
    if (interaction.customId !== this.options.customId) return;
    this.onClick(interaction);
  }

  getInteractionType() {
    return "button" as const;
  }

  public static create(
    options: Partial<ConstructorParameters<typeof ButtonComponent>[0]> = {
      style: ButtonStyle.Primary,
      customId: Date.now().toString(),
    },
    callback: (interaction: Discord.ButtonInteraction) => unknown = () => {},
  ) {
    return new this({
      onClick: callback,
      customId:
        (options.label?.replaceAll(/\s/g, "-") || "") +
        (options.emoji?.toString() || "") +
        options.customId!,
      ...options,
    });
  }
}
