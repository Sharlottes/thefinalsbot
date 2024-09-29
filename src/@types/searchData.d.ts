interface TFAPIResponse {
  meta: {
    leaderboardVersion: string;
    leaderboardPlatform: string;
    nameFilter: string;
    returnRawData: boolean;
    returnCountOnly: boolean;
  };
  count: number;
  data: LeaderboardData[];
}

type Platforms = "crossplay" | "steam" | "xbox" | "psn";
type LeaderboardData = ValidVersionMap[keyof ValidVersionMap]["data"];
type ValidVersionMap = {
  cb1: {
    versions: never;
    data: LeaderboardDataCB;
  };
  cb2: {
    versions: never;
    data: LeaderboardDataCB;
  };
  ob: {
    versions: Platforms;
    data: LeaderboardDataOB;
  };
  s1: {
    versions: Platforms;
    data: LeaderboardDataS1;
  };
  s2: {
    versions: Platforms;
    data: LeaderboardDataS2;
  };
  s3: {
    versions: "crossplay";
    data: LeaderboardDataS3;
  };
  s3worldtour: {
    versions: "crossplay";
    data: LeaderboardDataS3WT;
  };
  "the-finals": {
    versions: "crossplay";
    data: LeaderboardDataS3WT;
  };
  s4: {
    versions: "crossplay";
    data: LeaderboardDataS3WT;
  };
  s4worldtour: {
    versions: "crossplay";
    data: LeaderboardDataS3WT;
  };
  s4sponsor: {
    versions: "crossplay";
    data: LeaderboardDataS3WT;
  };
};

interface LeaderboardDataNameMixin {
  name: string;
  steamName: string;
  xboxName: string;
  psnName: string;
}

interface LeaderboardDataCB extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  league: string;
  fame: number;
  xp: number;
  level: number;
  cashouts: number;
}
interface LeaderboardDataOB extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  league: string;
  fame: number;
  cashouts: number;
}
interface LeaderboardDataS1 extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  league: string;
  fame: number;
  cashouts: number;
}
interface LeaderboardDataS2 extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  leagueNumber: number;
  league: string;
  cashouts: number;
}
interface LeaderboardDataS3 extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  leagueNumber: number;
  league: string;
  rankScore: number;
}
interface LeaderboardDataS4 extends LeaderboardDataNameMixin {
  rank: number;
  change: number;
  leagueNumber: number;
  league: string;
  cashouts: number;
}
interface LeaderboardDataS3WT extends LeaderboardDataNameMixin {
  rank: number;
  cashouts: number;
}
interface LeaderboardDataS4WT extends LeaderboardDataNameMixin {
  rank: number;
  cashouts: number;
}
interface LeaderboardDataS4Sponsor extends LeaderboardDataNameMixin {
  rank: number;
  sponsor: string;
  fans: number;
}
interface LeaderboardDataTF extends LeaderboardDataNameMixin {
  rank: number;
  tournamentWins: number;
}
interface LeaderboardDataTF extends LeaderboardDataNameMixin {
  rank: number;
  score: number;
}
