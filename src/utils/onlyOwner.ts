export default function onlyOwner(id: string) {
  return (i: Discord.ButtonInteraction) => {
    i.deferUpdate();
    return i.user.id === id;
  };
}
