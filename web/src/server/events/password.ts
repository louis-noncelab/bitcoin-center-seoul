import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const prefix = "scrypt$131072$8$1$";
const format = /^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

export function validPasswordHash(value: string): boolean {
  return format.test(value);
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function createPasswordHash(password: string): Promise<string> {
  if (password.length < 1 || password.length > 1024) throw new Error("Password must contain 1–1024 characters.");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const match = format.exec(encoded);
  if (!match?.[1] || !match[2]) throw new Error("Invalid administrator password hash.");
  if (password.length < 1 || password.length > 1024) return false;
  const key = await derive(password, Buffer.from(match[1], "hex"));
  return timingSafeEqual(key, Buffer.from(match[2], "hex"));
}
