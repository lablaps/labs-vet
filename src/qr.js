const alphanumeric = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const dataCodewords = 19;
const errorCodewords = 7;
const qrSize = 21;

let gfReady = false;
const gfExp = new Array(512).fill(0);
const gfLog = new Array(256).fill(0);

export function createQrSvg(value, options = {}) {
  const matrix = createQrMatrix(value);
  const quiet = 4;
  const total = qrSize + quiet * 2;
  const dark = options.dark || "#111111";
  const light = options.light || "#ffffff";
  const label = escapeXml(String(value || ""));
  const modules = [];

  matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) modules.push(`M${x + quiet},${y + quiet}h1v1h-1z`);
    });
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR ${label}">`,
    `<title>${label}</title>`,
    `<rect width="${total}" height="${total}" fill="${light}"/>`,
    `<path fill="${dark}" d="${modules.join("")}"/>`,
    "</svg>",
  ].join("");
}

export function normalizeQrValue(value) {
  const text = String(value || "SEM-PROTOCOLO")
    .toUpperCase()
    .replace(/[^0-9A-Z $%*+\-./:]/g, "-");
  return text.slice(0, 25) || "SEM-PROTOCOLO";
}

function createQrMatrix(value) {
  const payload = normalizeQrValue(value);
  const bytes = encodeAlphanumeric(payload);
  const ecc = reedSolomon(bytes, errorCodewords);
  const bits = [...bytes, ...ecc].flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >> (7 - index)) & 1),
  );
  const matrix = Array.from({ length: qrSize }, () => Array(qrSize).fill(false));
  const reserved = Array.from({ length: qrSize }, () => Array(qrSize).fill(false));

  const setFunction = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= qrSize || y >= qrSize) return;
    matrix[y][x] = Boolean(dark);
    reserved[y][x] = true;
  };

  drawFinder(setFunction, 0, 0);
  drawFinder(setFunction, qrSize - 7, 0);
  drawFinder(setFunction, 0, qrSize - 7);
  drawTiming(setFunction);
  setFunction(8, 13, true);
  drawFormat(setFunction, 0);

  let bitIndex = 0;
  let upward = true;

  for (let col = qrSize - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    for (let offset = 0; offset < qrSize; offset += 1) {
      const row = upward ? qrSize - 1 - offset : offset;

      for (let lane = 0; lane < 2; lane += 1) {
        const x = col - lane;
        if (reserved[row][x]) continue;
        const masked = (bits[bitIndex] || 0) ^ maskZero(x, row);
        matrix[row][x] = Boolean(masked);
        bitIndex += 1;
      }
    }

    upward = !upward;
  }

  drawFormat(setFunction, formatBits(1, 0));
  return matrix;
}

function encodeAlphanumeric(value) {
  const bits = [];
  pushBits(bits, 0b0010, 4);
  pushBits(bits, value.length, 9);

  for (let index = 0; index < value.length; index += 2) {
    const first = alphanumeric.indexOf(value[index]);
    const second = alphanumeric.indexOf(value[index + 1]);

    if (second >= 0) {
      pushBits(bits, first * 45 + second, 11);
    } else {
      pushBits(bits, first, 6);
    }
  }

  const capacity = dataCodewords * 8;
  pushBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const bytes = [];
  for (let index = 0; index < bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8).join(""), 2));
  }

  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (bytes.length < dataCodewords) {
    bytes.push(pads[padIndex % pads.length]);
    padIndex += 1;
  }

  return bytes;
}

function pushBits(bits, value, length) {
  for (let shift = length - 1; shift >= 0; shift -= 1) {
    bits.push((value >> shift) & 1);
  }
}

function drawFinder(setFunction, left, top) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const absoluteX = left + x;
      const absoluteY = top + y;
      const separator = x < 0 || x > 6 || y < 0 || y > 6;
      const ring = x === 0 || x === 6 || y === 0 || y === 6;
      const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      setFunction(absoluteX, absoluteY, !separator && (ring || center));
    }
  }
}

function drawTiming(setFunction) {
  for (let index = 8; index < qrSize - 8; index += 1) {
    const dark = index % 2 === 0;
    setFunction(index, 6, dark);
    setFunction(6, index, dark);
  }
}

function drawFormat(setFunction, bits) {
  for (let index = 0; index <= 5; index += 1) setFunction(8, index, (bits >> index) & 1);
  setFunction(8, 7, (bits >> 6) & 1);
  setFunction(8, 8, (bits >> 7) & 1);
  setFunction(7, 8, (bits >> 8) & 1);
  for (let index = 9; index < 15; index += 1) setFunction(14 - index, 8, (bits >> index) & 1);

  for (let index = 0; index < 8; index += 1) setFunction(qrSize - 1 - index, 8, (bits >> index) & 1);
  for (let index = 8; index < 15; index += 1) setFunction(8, qrSize - 15 + index, (bits >> index) & 1);
  setFunction(8, 13, true);
}

function maskZero(x, y) {
  return (x + y) % 2 === 0 ? 1 : 0;
}

function formatBits(errorLevel, mask) {
  const data = (errorLevel << 3) | mask;
  let value = data << 10;

  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((value >> bit) & 1) === 1) {
      value ^= 0x537 << (bit - 10);
    }
  }

  return ((data << 10) | value) ^ 0x5412;
}

function reedSolomon(bytes, degree) {
  initGalois();
  const generator = generatorPolynomial(degree);
  const result = new Array(degree).fill(0);

  bytes.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);

    for (let index = 0; index < degree; index += 1) {
      result[index] ^= gfMultiply(generator[index + 1], factor);
    }
  });

  return result;
}

function generatorPolynomial(degree) {
  let result = [1];
  for (let index = 0; index < degree; index += 1) {
    result = multiplyPolynomials(result, [1, gfExp[index]]);
  }
  return result;
}

function multiplyPolynomials(left, right) {
  const result = new Array(left.length + right.length - 1).fill(0);
  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] ^= gfMultiply(leftValue, rightValue);
    });
  });
  return result;
}

function initGalois() {
  if (gfReady) return;
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    gfExp[index] = value;
    gfLog[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < gfExp.length; index += 1) {
    gfExp[index] = gfExp[index - 255];
  }
  gfReady = true;
}

function gfMultiply(left, right) {
  if (left === 0 || right === 0) return 0;
  return gfExp[gfLog[left] + gfLog[right]];
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
