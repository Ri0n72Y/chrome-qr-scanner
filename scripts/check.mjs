import assert from "node:assert/strict";
import { encodeQR } from "qr";
import decodeQR from "qr/decode.js";

const expected = "https://example.com/qr-smoke";
const matrix = encodeQR(expected, "raw", { border: 4 });
const scale = 4;
const size = matrix.length * scale;
const data = new Uint8Array(size * size);

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    data[y * size + x] = matrix[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255;
  }
}

assert.equal(decodeQR({ width: size, height: size, data }), expected);
console.log("QR decoder smoke check passed");
