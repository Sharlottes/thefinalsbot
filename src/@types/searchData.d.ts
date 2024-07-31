export interface LeaderboardData {
  meta?: LeaderboardMeta;
  count?: number;
  data?: LeaderBoardUserData[];
}

export interface LeaderboardMeta {
  leaderboardVersion: string;
  leaderboardPlatform: string;
  nameFilter: string;
  returnRawData: boolean;
  returnCountOnly: boolean;
}

export interface LeaderboardConstructor {
  page: number;
  leaderboard: LeaderboardData;
}

export interface LeaderBoardUserData {
  rank: number;
  change: number;
  leagueNumber: number;
  league: string;
  name: string;
  steamName: string;
  xboxName: string;
  psnName: string;
  cashouts: number;
}
