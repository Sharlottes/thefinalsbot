interface Profile {
  nickname: string;
  clanname?: string;
  position?: string;
  ability?: string;
  weapon?: string;
  gadget: string[];
}

type MaybePromise<T> = T | Promise<T>;

interface InteractiveTypeMap {
  button: Discord.ButtonInteraction;
}
interface Interactive<
  K extends keyof InteractiveTypeMap = keyof InteractiveTypeMap,
> {
  handleInteraction(interaction: InteractiveTypeMap[K]): void;
  getInteractionType(): K;
}
