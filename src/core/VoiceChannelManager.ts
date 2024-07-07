import { ChannelType } from "discord.js";
import { Discord, On, Once } from "discordx";
import Vars from "../Vars";

interface VoiceChannelData {
  channel: Discord.VoiceChannel;
  latestBlankTimer: NodeJS.Timeout;
  removeTime: number;
}

@Discord()
export default class VoiceChannelManager {
  private static readonly voiceChannels: Map<string, VoiceChannelData> =
    new Map();

  @On({ event: "voiceStateUpdate" })
  async onVoiceStateUpdate([
    oldState,
    newState,
  ]: DiscordX.ArgsOf<"voiceStateUpdate">) {
    this.validateChannel(oldState.channel);
    this.validateChannel(newState.channel);
  }

  private validateChannel(channel?: Discord.VoiceBasedChannel | null) {
    if (channel?.type !== ChannelType.GuildVoice) return;

    const data = VoiceChannelManager.voiceChannels.get(channel.id);
    if (!data) return;

    clearTimeout(data.latestBlankTimer);
    if (channel.members.size !== 0) return;

    data.latestBlankTimer = setTimeout(
      () => VoiceChannelManager.handleChannelTimeout(data),
      data.removeTime,
    );
  }

  private static handleChannelTimeout(data: VoiceChannelData) {
    VoiceChannelManager.voiceChannels.delete(data.channel.id);
    data.channel.delete();
  }

  public static async createVoiceChannel(
    name: string,
    {
      removeTime = 1000 * 7,
      parent = Vars.matchMakingCategory,
      owner,
    }: CreateVoiceChannelOptions = {
      removeTime: 1000 * 7,
      parent: Vars.matchMakingCategory,
    },
  ) {
    const channel = await Vars.mainGuild.channels.create({
      type: ChannelType.GuildVoice,
      name,
      parent,
    });
    const data: VoiceChannelData = {
      channel,
      removeTime,
      latestBlankTimer: setTimeout(
        () => this.handleChannelTimeout(data),
        removeTime,
      ),
    };
    if (owner) {
      channel.permissionOverwrites.create(owner.id, {
        Administrator: true,
      });
    }
    this.voiceChannels.set(channel.id, data);
    return channel;
  }
}

interface CreateVoiceChannelOptions {
  owner?: Discord.User;
  removeTime?: number;
  parent?: Discord.CategoryChannelResolvable;
}
