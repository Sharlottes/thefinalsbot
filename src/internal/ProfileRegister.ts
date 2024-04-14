import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  bold,
  italic,
} from "discord.js";
import throwInteraction from "@/utils/throwInteraction";
import { contentDataset } from "@/constants/contentDataset";

export default class ProfileRegister {
  public nickname?: string;
  public clanname?: string;
  public position?: string;
  public ability?: string;
  public weapon?: string;
  public gadget?: string;

  constructor(
    public readonly interaction: Discord.ChatInputCommandInteraction,
    public readonly battleTag: string,
  ) {}

  public async rerender() {
    if (!this.interaction.deferred && !this.interaction.replied) {
      await this.interaction.deferReply();
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
              value: this.nickname || "비어있음",
              inline: true,
            },
            {
              name: "클랜명",
              value: this.clanname || "비어있음",
              inline: true,
            },
            {
              name: "포지션",
              value: this.position || "선택되지 않음",
              inline: true,
            },
            {
              name: "주특기",
              value: this.ability || "선택되지 않음",
              inline: true,
            },
            {
              name: "무기",
              value: this.weapon || "선택되지 않음",
              inline: true,
            },
            {
              name: "가젯",
              value: this.gadget || "선택되지 않음",
              inline: true,
            },
          ),
      ],
      components: [
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
              this.position
                ? { heavy: "대형", middle: "중형", light: "소형" }[
                    this.position as "heavy" | "middle" | "light"
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
            .setPlaceholder(this.ability ?? "주특기를 선택해주세요")
            .addOptions(
              this.position
                ? contentDataset[this.position].abilities.map((ability) => ({
                    label: ability,
                    value: ability,
                  }))
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("weapon")
            .setPlaceholder(this.weapon ?? "무기를 선택해주세요")
            .addOptions(
              this.position
                ? contentDataset[this.position].weapons.map((weapon) => ({
                    label: weapon,
                    value: weapon,
                  }))
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("gadget")
            .setPlaceholder(this.gadget ?? "가젯을 선택해주세요")
            .addOptions(
              this.position
                ? contentDataset[this.position].gadgets.map((gadget) => ({
                    label: gadget,
                    value: gadget,
                  }))
                : [{ label: "비어있음", value: "선택되지 않음" }],
            ),
        ),
      ],
    });

    const interaction = await message.awaitMessageComponent({
      time: 1000 * 60 * 5,
    });

    if (interaction.isStringSelectMenu()) {
      throwInteraction(interaction);
      switch (interaction.customId) {
        case "position":
          const newPosition = interaction.values[0];
          if (this.position !== newPosition) {
            if (
              !contentDataset[newPosition].abilities.includes(
                this.ability ?? "",
              )
            ) {
              this.ability = "선택되지 않음";
            }
            if (
              !contentDataset[newPosition].weapons.includes(this.weapon ?? "")
            ) {
              this.weapon = "선택되지 않음";
            }
            if (
              !contentDataset[newPosition].gadgets.includes(this.gadget ?? "")
            ) {
              this.gadget = "선택되지 않음";
            }
          }

          this.position = interaction.values[0];
          break;
        case "ability":
          this.ability = interaction.values[0];
          break;
        case "weapon":
          this.weapon = interaction.values[0];
          break;
        case "gadget":
          this.gadget = interaction.values[0];
          break;
      }
      this.rerender();
    }
  }
}
