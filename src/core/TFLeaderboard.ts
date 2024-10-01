import leaderboardsScheme from "@/constants/leaderboardsScheme";
import LeaderboardCacheModel from "@/models/LeaderboardCacheModel";
import { StatusCodes } from "http-status-codes";

const cronGap = 1 * 60 * 60 * 1000;
const toUpdate = ["s4", "s4sponsor", "s4worldtour"] satisfies (keyof LeaderboardDataMap)[] as string[];

export default class TFLeaderboard {
  private static _main: TFLeaderboard;
  public static get main() {
    return this._main ?? (this._main = new TFLeaderboard());
  }

  public async init() {
    setInterval(() => this.updateRecord(), cronGap);
    this.updateRecord();
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

  private async updateRecord() {
    const version = "s4";
    const data = await this.update(`${version}-crossplay`);
    if (!data) return;

    const docs = await LeaderboardCacheModel.find();
    docs.forEach(async (doc, i) => {
      const idx = data.findIndex((d) => d.name === doc.name);
      if (idx == -1) return;
      const newData = data[idx] as LeaderboardDataS4;
      data.splice(idx, 1);
      const latestData = doc.data.at(-1)!;
      if (latestData.point === newData.rankScore || latestData.updatedAt > new Date(Date.now() - cronGap)) return;

      console.log("update", i);
      doc.data.push({
        point: newData.rankScore,
        leagueId: newData.leagueNumber,
        rank: newData.rank,
        updatedAt: new Date(),
      });
      await doc.save();
    });

    for (const d of data) {
      const newData = d as LeaderboardDataS4;
      LeaderboardCacheModel.create({
        name: newData.name,
        data: [
          {
            point: newData.rankScore,
            league: newData.league,
            rank: newData.rank,
            updatedAt: new Date(),
          },
        ],
        lastUpdated: Date.now(),
      });
    }
  }

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
