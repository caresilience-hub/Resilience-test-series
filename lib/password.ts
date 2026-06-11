import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, storedHash] = hash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(storedHash, "hex");

  if (expected.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expected);
}

export function generateTemporaryPassword(length = 12) {
  const safeLength = Math.max(8, length);
  const bytes = randomBytes(safeLength);

  let password = "";
  for (let index = 0; index < safeLength; index += 1) {
    password += TEMP_PASSWORD_ALPHABET[bytes[index] % TEMP_PASSWORD_ALPHABET.length];
  }

  return password;
}
