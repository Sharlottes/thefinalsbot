import leaderboardsScheme from "@/constants/leaderboardsScheme";
import { StatusCodes } from "http-status-codes";

const cronGap = 12 * 60 * 60 * 1000;
const toUpdate = [
  "s4",
  "s4sponsor",
  "s4worldtour",
] satisfies (keyof LeaderboardDataMap)[] as string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[] satisfies string[];

export default class TFLeaderboard {
  private static _main: TFLeaderboard;
  public static get main() {
    return this._main ?? (this._main = new TFLeaderboard());
  }

  private readonly leaderboardCache: Record<
    string,
    {
      lastUpdated: number;
      data: LeaderboardData[];
    }
  > = Object.fromEntries(
    Object.keys(leaderboardsScheme)
      .map((key) =>
        leaderboardsScheme[key as keyof LeaderboardDataMap].map((version) => [
          `${key}-${version}`,
          {
            lastUpdated: 0,
            data: [] as LeaderboardData[],
          },
        ]),
      )
      .flat(),
  );

  public async get<K extends keyof LeaderboardDataMap>(
    version: K,
    ...[platform]: LeaderboardDataMap[K]["versions"] extends "crossplay" | null
      ? [undefined?]
      : [LeaderboardDataMap[K]["versions"]]
  ) {
    const id = `${version}-${platform ?? "crossplay"}`;
    const data = this.leaderboardCache[id];
    if (data.data.length == 0 || (toUpdate.includes(version) && Date.now() - data.lastUpdated > cronGap)) {
      const data = await this.update(id);
      return data;
    }

    return data.data;
  }

  async update(id: string) {
    const [version, platform] = id.split("-");
    const result = await fetch(`https://api.the-finals-leaderboard.com/v1/leaderboard/${version}/${platform}`)
      .then(async (response) => ({
        status: response.status,
        data: (await response.json()) as TFAPIResponse,
      }))
      .catch((e) => console.warn(e));
    if (result === undefined || result.status != StatusCodes.OK) {
      return;
    }
    const data = this.leaderboardCache[id];
    data.lastUpdated = Date.now();
    data.data = result.data.data;
    return result.data.data;
  }
}
