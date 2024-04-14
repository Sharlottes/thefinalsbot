export default function onlyOwner(id: string) {
  return (i: Discord.ButtonInteraction) => {
    console.log(id, i.user.id);
    i.deferUpdate();
    return i.user.id === id;
  };
}
