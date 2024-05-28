import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  StringSelectMenuBuilder,
  bold,
  italic,
} from "discord.js";
import throwInteraction from "@/utils/throwInteraction";
import { contentDataset } from "@/constants/contentDataset";
import UserModel from "@/models/UserModel";
import { createComponents } from "@/utils/createComponent";

export default class ProfileRegister {
  profile: Profile = {
    nickname: "",
    clanname: "",
    position: "",
    ability: "",
    weapon: "",
    gadget: [],
  };

  constructor(
    public readonly interaction: Discord.ChatInputCommandInteraction,
    public readonly battleTag: string,
  ) {}

  public async rerender() {
    if (!this.interaction.deferred && !this.interaction.replied) {
      await this.interaction.deferReply();
    }
    const user = await UserModel.findOne({
      discordId: this.interaction.user.id,
    });
    if (user) {
      this.profile = user.profile;
    }
    const message = await this.interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("프로필 등록에 오신 것을 환영합니다!")
          .setDescription(
            `
* 프로필 등록을 위해 ${bold("닉네임")}과 ${bold("클랜명")}을 입력해주세요.
* 그 다음으로 ${bold("선호 포지션")}과 ${bold("특수능력")}, ${bold("가젯")}을 선택해주세요.

${italic("프로필 등록은 다시할 수 있습니다.")}
      `,
          )
          .setFields(
            {
              name: "닉네임",
              value: this.profile.nickname || "비어있음",
              inline: true,
            },
            {
              name: "클랜명",
              value: this.profile.clanname || "비어있음",
              inline: true,
            },
            {
              name: "포지션",
              value: this.profile.position || "선택되지 않음",
              inline: true,
            },
            {
              name: "주특기",
              value: this.profile.ability || "선택되지 않음",
              inline: true,
            },
            {
              name: "무기",
              value: this.profile.weapon || "선택되지 않음",
              inline: true,
            },
            {
              name: "가젯",
              value: this.profile.gadget.join(", ") || "선택되지 않음",
              inline: true,
            },
          )
          .setFooter(
            user
              ? {
                  text: "주의: 프로필이 이미 존재합니다. 다시 등록할 경우 기존 프로필을 덮어씁니다.",
                }
              : null,
          ),
      ],
      components: createComponents(
        [
          "#text_input.Secondary|닉네임과 클랜명 입력하기",
          "#submit.Success|확인",
          "#cancel.Danger|취소",
        ],
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("text_input")
            .setLabel("닉네임과 클랜명 입력하기")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("submit")
            .setLabel("확인")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("취소")
            .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("position")
            .setPlaceholder(
              this.profile.position
                ? { heavy: "대형", middle: "중형", light: "소형" }[
                    this.profile.position as "heavy" | "middle" | "light"
                  ]
                : "포지션을 선택해주세요",
            )
            .addOptions([
              { label: "대형", value: "heavy" },
              { label: "중형", value: "middle" },
              { label: "소형", value: "light" },
            ]),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("ability")
            .setPlaceholder(this.profile.ability ?? "주특기를 선택해주세요")
            .addOptions(
              this.profile.position
                ? contentDataset[this.profile.position].abilities.map(
                    (ability) => ({
                      label:
                        ability +
                        (this.profile.ability == ability ? " ✅" : ""),
                      value: ability,
                    }),
                  )
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("weapon")
            .setPlaceholder(this.profile.weapon ?? "무기를 선택해주세요")
            .addOptions(
              this.profile.position
                ? contentDataset[this.profile.position].weapons.map(
                    (weapon) => ({
                      label:
                        weapon + (this.profile.weapon == weapon ? " ✅" : ""),
                      value: weapon,
                    }),
                  )
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("gadget")
            .setPlaceholder(
              this.profile.gadget.join(", ") || "가젯을 선택해주세요",
            )
            .addOptions(
              this.profile.position
                ? contentDataset[this.profile.position].gadgets.map(
                    (gadget) => ({
                      label:
                        gadget +
                        (this.profile.gadget.includes(gadget) ? " ✅" : ""),
                      value: gadget,
                    }),
                  )
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
      ) as Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>[],
    });

    const interaction = await message.awaitMessageComponent({
      time: 1000 * 60 * 5,
    });

    if (interaction.isStringSelectMenu()) {
      switch (interaction.customId) {
        case "position":
          const newPosition = interaction.values[0];
          if (this.profile.position !== newPosition) {
            if (
              !contentDataset[newPosition].abilities.includes(
                this.profile.ability ?? "",
              )
            ) {
              this.profile.ability = undefined;
            }
            if (
              !contentDataset[newPosition].weapons.includes(
                this.profile.weapon ?? "",
              )
            ) {
              this.profile.weapon = undefined;
            }

            this.profile.gadget.filter((g) =>
              contentDataset[newPosition].gadgets.includes(g),
            );
          }

          this.profile.position = interaction.values[0];
          break;
        case "ability":
          this.profile.ability = interaction.values[0];
          break;
        case "weapon":
          this.profile.weapon = interaction.values[0];
          break;
        case "gadget":
          const value = interaction.values[0];
          if (this.profile.gadget.includes(value)) {
            this.profile.gadget = this.profile.gadget.filter(
              (g) => g !== value,
            );
          } else if (this.profile.gadget.length < 3) {
            this.profile.gadget.push(value);
          } else {
            interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("이런!")
                  .setDescription("가젯은 총 3개만 가능합니다!")
                  .setColor(Colors.Red),
              ],
              ephemeral: true,
            });
          }
          break;
      }
      throwInteraction(interaction);
      this.rerender();
    }
  }
}
