interface Profile {
  nickname: string;
  clanname?: string;
  position?: string;
  ability?: string;
  weapon?: string;
  gadget: string[];
}

type MaybePromise<T> = T | Promise<T>;
type MaybeArray<T> = T | T[];

type Override<
  Target extends Record<PropertyKey, unknown>,
  Omits extends keyof Target,
  NewTypes extends Record<Omits, unknown>,
> = Omit<Target, Omits> & NewTypes;
interface InteractiveTypeMap {
  button: Discord.ButtonInteraction;
}
interface Interactive<K extends keyof InteractiveTypeMap = keyof InteractiveTypeMap> {
  handleInteraction(interaction: InteractiveTypeMap[K]): void;
  getInteractionType(): K;
}

type OverwriteReturn<T extends (...args: any[]) => any, NT> = T extends (...args: infer P) => any
  ? (...args: P) => NT
  : never;
