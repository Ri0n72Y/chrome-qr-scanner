import assert from "node:assert/strict";
import { encodeQR } from "qr";
import decodeQR from "qr/decode.js";

const expected = "https://example.com/qr-smoke";
const matrix = encodeQR(expected, "raw", { border: 4 });
const scale = 4;
const size = matrix.length * scale;
const data = new Uint8Array(size * size * 4);

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const color = matrix[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255;
    const i = (y * size + x) * 4;
    data[i] = color;
    data[i + 1] = color;
    data[i + 2] = color;
    data[i + 3] = 255;
  }
}

assert.equal(decodeQR({ width: size, height: size, data }), expected);
console.log("QR decoder smoke check passed");
