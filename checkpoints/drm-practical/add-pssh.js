// Appends a W3C common-system pssh box (version 1, KID list, no data) to the moov box of an MP4 file.
// Usage: node add-pssh.mjs <file.mp4> <kid-hex>
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

// #region add-pssh
const COMMON_SYSTEM_ID = "1077efecc0b24d02ace33c1e52e2fb4b"; // W3C common PSSH box

function buildPssh(kidHex) {
  const kid = Buffer.from(kidHex, "hex");
  const box = Buffer.alloc(4 + 4 + 4 + 16 + 4 + kid.length + 4);
  let o = 0;
  box.writeUInt32BE(box.length, o); o += 4;
  box.write("pssh", o, "latin1"); o += 4;
  box.writeUInt32BE(0x01000000, o); o += 4; // version 1, flags 0
  Buffer.from(COMMON_SYSTEM_ID, "hex").copy(box, o); o += 16;
  box.writeUInt32BE(1, o); o += 4; // KID_count
  kid.copy(box, o); o += kid.length;
  box.writeUInt32BE(0, o); // data_size: no system-specific data
  return box;
}

function addPsshToMoov(file, kidHex) {
  const bytes = readFileSync(file);
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    if (type === "moov") {
      const pssh = buildPssh(kidHex);
      const end = offset + size;
      const out = Buffer.concat([bytes.subarray(0, end), pssh, bytes.subarray(end)]);
      out.writeUInt32BE(size + pssh.length, offset); // grow moov to contain the pssh
      writeFileSync(file, out);
      return;
    }
    offset += size;
  }
  throw new Error("no moov box found");
}
// #endregion add-pssh

const [file, kid] = process.argv.slice(2);
addPsshToMoov(file, kid);
