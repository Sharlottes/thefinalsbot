export default class RoomData {
  // 생성된 방들
  public readonly channels: Set<Discord.VoiceChannel> = new Set();
  // [방ID]: 초대링크 메시지들
  public readonly messages: Map<Discord.Snowflake, Discord.Message[]> = new Map();

  constructor(
    public readonly name: string,
    public readonly channel: Discord.TextChannel,
  ) {}
}
