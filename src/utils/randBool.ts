var arr = new Uint8Array(1);

export default function randBool(probability: number): boolean {
  crypto.getRandomValues(arr);
  return arr[0] / 255 <= probability;
}
