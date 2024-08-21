import { Discord, ButtonComponent } from "discordx";

/**
 * defer의 최대 시간
 * @see https://discordjs.guide/slash-commands/response-methods.html#deferred-responses */

const Timeout = 1000 * 60 * 14;

@Discord()
export default class InteractionObserver {
  private static _main: InteractionObserver;
  public static get main() {
    return this._main;
  }

  constructor() {
    InteractionObserver._main = this;
  }

  public readonly interactives = new Set<Interactive>();

  @ButtonComponent({ id: /.*/ })
  public async handleButtonInteraction(interaction: Discord.ButtonInteraction) {
    this.interactives.forEach((interactive) => {
      if (interactive.getInteractionType() === "button") {
        interactive.handleInteraction(interaction);
      }
    });
  }

  public addInteractive(interactive: Interactive) {
    this.interactives.add(interactive);
    setTimeout(() => {
      this.removeInteractive(interactive);
    }, Timeout);
  }

  public removeInteractive(interactive: Interactive) {
    this.interactives.delete(interactive);
  }
}
