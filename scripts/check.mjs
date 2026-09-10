import assert from "node:assert/strict";
import { encodeQR } from "qr";
import { decodeQRBatch } from "qr/decode.js";

const expected = ["https://example.com/qr-one", "QR TWO"];
const matrices = expected.map((value) => encodeQR(value, "raw", { border: 4 }));
const scale = 4;
const gap = 24;
const widths = matrices.map((matrix) => matrix.length * scale);
const width = widths[0] + gap + widths[1];
const height = Math.max(...widths);
const data = new Uint8Array(width * height * 4);
data.fill(255);

let offsetX = 0;
for (const matrix of matrices) {
  const size = matrix.length * scale;
  const offsetY = Math.floor((height - size) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!matrix[Math.floor(y / scale)][Math.floor(x / scale)]) continue;
      const i = ((offsetY + y) * width + offsetX + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  offsetX += size + gap;
}

const detections = [];
const [results] = await decodeQRBatch([{ width, height, data }], {
  maxSize: { width, height },
  effort: Infinity,
  timeLimit: Infinity,
  pointsOnDetect: (points, result) => {
    if (typeof result === "string") {
      detections.push({ value: result, outline: points.outline });
    }
  }
});

assert.deepEqual(
  results.filter((value) => typeof value === "string").sort(),
  [...expected].sort()
);
assert.equal(detections.length, 2);
assert.ok(
  detections.every(
    ({ outline }) =>
      outline.length === 4 && outline.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))
  )
);
console.log("Multi-QR decoder smoke check passed");
