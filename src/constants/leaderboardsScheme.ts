const leaderboardsScheme: {
  [K in keyof LeaderboardDataMap]: LeaderboardDataMap[K]["versions"] extends Platforms
    ? LeaderboardDataMap[K]["versions"][]
    : string[];
} = {
  cb1: ["crossplay"],
  cb2: ["crossplay"],
  ob: ["crossplay", "steam", "xbox", "psn"],
  s1: ["crossplay", "steam", "xbox", "psn"],
  s2: ["crossplay", "steam", "xbox", "psn"],
  s3: ["crossplay"],
  s3worldtour: ["crossplay"],
  "the-finals": ["crossplay"],
  s4: ["crossplay"],
  s4worldtour: ["crossplay"],
  s4sponsor: ["crossplay"],
  orf: ["crossplay"],
};
export default leaderboardsScheme;