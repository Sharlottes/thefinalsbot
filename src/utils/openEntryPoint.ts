import { promisify } from "node:util";
import { readdir } from "fs";
import path from "path";

export default async function openEntryPoint(dir = "command") {
  const files = await promisify(readdir)(path.resolve(process.cwd(), "dist", dir));
  await Promise.all(
    files
      .filter((n) => !n.endsWith(".js.map"))
      .map(async (n): Promise<void> => {
        const [name, ext] = n.split(".");
        if (!ext) {
          await openEntryPoint(`${dir}/${n}`);
          return;
        }
        if (ext == "js") {
          await import(`../${dir}/${n}`);
          console.log(`기능 ${name} 등록 완료`);
        }
      }),
  );
}
