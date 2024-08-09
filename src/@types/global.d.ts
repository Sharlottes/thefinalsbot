interface Profile {
  nickname: string;
  clanname?: string;
  position?: string;
  ability?: string;
  weapon?: string;
  gadget: string[];
}

type MaybePromise<T> = T | Promise<T>;
