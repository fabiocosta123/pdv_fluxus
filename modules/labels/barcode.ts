const EAN_L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

const EAN_G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];

const EAN_R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];

const EAN_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

const CODE128 = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
];

export type BarcodeMark = {
  bits: string;
  text: string;
};

function eanCheck(body: string) {
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    const weight = (body.length - index) % 2 === 0 ? 1 : 3;
    sum += Number(body[index]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function ean13(code: string) {
  const digits = code.split("").map(Number);
  const parity = EAN_PARITY[digits[0]];
  let bits = "101";
  for (let index = 0; index < 6; index += 1) {
    const table = parity[index] === "L" ? EAN_L : EAN_G;
    bits += table[digits[index + 1]];
  }
  bits += "01010";
  for (let index = 0; index < 6; index += 1) bits += EAN_R[digits[index + 7]];
  bits += "101";
  return `000000000${bits}0000000`;
}

function ean8(code: string) {
  const digits = code.split("").map(Number);
  let bits = "101";
  for (let index = 0; index < 4; index += 1) bits += EAN_L[digits[index]];
  bits += "01010";
  for (let index = 4; index < 8; index += 1) bits += EAN_R[digits[index]];
  bits += "101";
  return `0000000${bits}0000000`;
}

function code128(value: string) {
  const codes = [...value].map((char) => char.charCodeAt(0) - 32);
  let checksum = 104;
  codes.forEach((code, index) => {
    checksum += code * (index + 1);
  });
  checksum %= 103;
  const quiet = "0".repeat(10);
  const data = [104, ...codes, checksum, 106].map((code) => CODE128[code]).join("");
  return `${quiet}${data}${quiet}`;
}

export function barcodeFor(raw: string | null | undefined): BarcodeMark | null {
  const code = raw?.trim() ?? "";
  if (!code) return null;

  if (/^\d{13}$/.test(code) && eanCheck(code.slice(0, 12)) === Number(code[12])) {
    return { bits: ean13(code), text: code };
  }
  if (/^\d{8}$/.test(code) && eanCheck(code.slice(0, 7)) === Number(code[7])) {
    return { bits: ean8(code), text: code };
  }
  if ([...code].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126)) {
    return { bits: code128(code), text: code };
  }
  return null;
}
