import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(new URL("../public/icon.svg", import.meta.url));

async function png(size) {
  return sharp(source).resize(size, size, { fit: "contain" }).png({ compressionLevel: 9 }).toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;
  images.forEach(({ size, data }, index) => {
    const entry = index * 16;
    directory.writeUInt8(size === 256 ? 0 : size, entry);
    directory.writeUInt8(size === 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2);
    directory.writeUInt8(0, entry + 3);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, directory, ...images.map(({ data }) => data)]);
}

await mkdir(new URL("../public/icons/", import.meta.url), { recursive: true });
const sizes = await Promise.all([16, 32, 180, 192, 512].map(async (size) => ({ size, data: await png(size) })));
const bySize = new Map(sizes.map((item) => [item.size, item.data]));

await Promise.all([
  writeFile(new URL("../app/favicon.ico", import.meta.url), ico(sizes.filter(({ size }) => size === 16 || size === 32))),
  writeFile(new URL("../app/icon.png", import.meta.url), bySize.get(32)),
  writeFile(new URL("../app/apple-icon.png", import.meta.url), bySize.get(180)),
  writeFile(new URL("../public/favicon-16x16.png", import.meta.url), bySize.get(16)),
  writeFile(new URL("../public/favicon-32x32.png", import.meta.url), bySize.get(32)),
  writeFile(new URL("../public/icons/icon-192.png", import.meta.url), bySize.get(192)),
  writeFile(new URL("../public/icons/icon-512.png", import.meta.url), bySize.get(512)),
]);

process.stdout.write("Generated favicon.ico, browser icons, Apple touch icon, and web app icons.\n");
