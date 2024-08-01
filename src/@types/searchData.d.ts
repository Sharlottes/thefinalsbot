interface LeaderboardData {
  meta: LeaderboardMeta;
  count: number;
  data: LeaderBoardUserData[];
}

interface LeaderboardMeta {
  leaderboardVersion: string;
  leaderboardPlatform: string;
  nameFilter: string;
  returnRawData: boolean;
  returnCountOnly: boolean;
}

type LeaderBoardUserData =
  | LeaderBoardUserDataCB
  | LeaderBoardUserDataOB
  | LeaderBoardUserDataS1
  | LeaderBoardUserDataS2
  | LeaderBoardUserDataWT
  | LeaderBoardUserDataTA;

interface BaseLeaderBoardUserData {
  rank: number;
  name: string;
  steamName: string;
  xboxName: string;
  psnName: string;
}

interface LeaderBoardUserDataCB extends BaseLeaderBoardUserData {
  change: number;
  league: string;
  fame: number;
  xp: number;
  level: number;
  cashouts: number;
}
interface LeaderBoardUserDataOB extends BaseLeaderBoardUserData {
  change: number;
  league: string;
  fame: number;
  cashouts: number;
}
interface LeaderBoardUserDataS1 extends BaseLeaderBoardUserData {
  change: number;
  league: string;
  fame: number;
  cashouts: number;
}
interface LeaderBoardUserDataS2 extends BaseLeaderBoardUserData {
  change: number;
  leagueNumber: number;
  league: string;
  cashouts: number;
}
interface LeaderBoardUserDataWT extends BaseLeaderBoardUserData {
  cashouts: number;
}

interface LeaderBoardUserDataTA extends BaseLeaderBoardUserData {
  change: number;
  leagueNumber: number;
  league: string;
  rankScore: number;
}
