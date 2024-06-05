import {
  Slash,
  Discord,
  SlashOption,
  SlashGroup,
  ModalComponent,
  ButtonComponent,
} from "discordx";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
  inlineCode,
} from "discord.js";
import throwInteraction from "@/utils/throwInteraction";
import ProfileRegister from "@/core/ProfileRegister";
import UserModel from "@/models/UserModel";

@SlashGroup({
  name: "프로필",
  description: "프로필 관련 명령어",
})
@Discord()
export default class UserService {
  profileSession: Map<Discord.Snowflake, ProfileRegister> = new Map();
  profileModal = new ModalBuilder()
    .setTitle("프로필 등록")
    .setCustomId("profile_register")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("nickname")
          .setLabel("닉네임")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("clanname")
          .setLabel("클랜명")
          .setPlaceholder("해당되지 않을 시 미작성")
          .setStyle(TextInputStyle.Short)
          .setRequired(false),
      ),
    );

  getSession(id: Snowflake) {
    const session = this.profileSession.get(id);
    if (!session) {
      throw new Error("세션을 찾을 수 없습니다");
    }
    return session;
  }

  @Slash({
    name: "등록",
    description: "프로필을 등록합니다",
  })
  @SlashGroup("프로필")
  private async registerProfile(
    @SlashOption({
      name: "배틀태그",
      description: "더 파이널스 인게임에서 표시되는 엠바크 ID (배틀태그)",
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    battleTag: string,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const profile = new ProfileRegister(interaction, battleTag);
    this.profileSession.set(interaction.user.id, profile);
    profile.rerender();
  }

  @ButtonComponent({
    id: "text_input",
  })
  async openTextModal(interaction: Discord.ButtonInteraction) {
    await interaction.showModal(this.profileModal);
  }

  @ModalComponent({
    id: "profile_register",
  })
  async RegisterForm(interaction: Discord.ModalSubmitInteraction) {
    const [nickname, clanname] = ["nickname", "clanname"].map((n) =>
      interaction.fields.getTextInputValue(n),
    );
    throwInteraction(interaction);
    const session = this.getSession(interaction.user.id);
    session.profile.nickname = nickname;
    session.profile.clanname = clanname;
    session.rerender();
  }

  @ButtonComponent({
    id: "submit",
  })
  async submitProfile(interaction: Discord.ButtonInteraction) {
    const session = this.getSession(interaction.user.id);

    if (
      !(
        session.profile.ability &&
        session.profile.weapon &&
        session.profile.gadget &&
        session.profile.nickname &&
        session.profile.position
      )
    ) {
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("이런!")
            .setDescription("프로필을 모두 입력해주세요!")
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 1000 * 3);

      return;
    }
    await interaction.deferReply();
    await new UserModel({
      discordId: interaction.user.id,
      battleTag: session.battleTag,
      profile: {
        nickname: session.profile.nickname,
        clanname: session.profile.clanname,
        position: session.profile.position,
        ability: session.profile.ability,
        weapon: session.profile.weapon,
        gadget: session.profile.gadget,
      },
    }).save();

    session.interaction.editReply({
      content: "프로필이 성공적으로 등록되었습니다!",
      embeds: [],
      components: [],
    });
    this.profileSession.delete(interaction.user.id);

    setTimeout(() => {
      session.interaction.deleteReply().catch(() => {});
    }, 1000 * 3);
  }

  @ButtonComponent({
    id: "cancel",
  })
  async cancelProfile(interaction: Discord.ButtonInteraction) {
    const session = this.getSession(interaction.user.id);
    session.interaction.deleteReply();
    this.profileSession.delete(interaction.user.id);
  }

  @Slash({
    name: "누가부스트함",
    description: "글쎄요",
  })
  private async whotfboosted(interaction: Discord.ChatInputCommandInteraction) {
    if (!interaction.guild) {
      interaction.reply("길드가 없ㄷ음");
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    interaction.editReply({
      content: members
        .filter((member) => member.premiumSince)
        .map((member) => inlineCode(member.user.tag) + "님이 부스트중입니다!")
        .join("\n"),
    });
  }

  @Slash({
    name: "확인",
    description: "등록한 프로필을 확인합니다",
  })
  @SlashGroup("프로필")
  private async infoProfile(
    @SlashOption({
      name: "배틀태그",
      description: "더 파이널스 인게임에서 표시되는 배틀태그",
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    battleTag: string,
    interaction: Discord.ChatInputCommandInteraction,
  ) {
    const user = await UserModel.findOne({ battleTag });
    if (!user) {
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("이런!")
            .setDescription(battleTag + "님의 프로필이 없습니다!")
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle(battleTag + "님의 프로필").setFields(
          {
            name: "닉네임",
            value: user.profile.nickname,
            inline: true,
          },
          {
            name: "클랜명",
            value: user.profile.clanname || "비어있음",
            inline: true,
          },
          {
            name: "포지션",
            value:
              { light: "소형", middle: "중형", heavy: "대형" }[
                user.profile.position ?? ""
              ] || "비어있음",
            inline: true,
          },
          {
            name: "주특기",
            value: user.profile.ability || "비어있음",
            inline: true,
          },
          {
            name: "무기",
            value: user.profile.weapon || "비어있음",
            inline: true,
          },
          {
            name: "가젯",
            value: user.profile.gadget.join(", "),
            inline: true,
          },
        ),
      ],
    });
  }
}
