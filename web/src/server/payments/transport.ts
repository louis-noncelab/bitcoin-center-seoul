import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { PaymentError, TransportError, type Transport } from "./types";

export function publicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export function lightningAddressOrigin(address: string): string | null {
  const domain = address.split("@")[1]?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  return `https://${domain}`;
}

export function publicHttpsUrl(input: string): URL {
  const url = URL.canParse(input) ? new URL(input) : null;
  if (!url || url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")
    || url.hostname.endsWith(".") || (isIP(url.hostname) && !publicIPv4(url.hostname))) {
    throw new PaymentError("UNTRUSTED_PROVIDER_URL");
  }
  return url;
}

export function trustedUrl(input: string, allowedOrigins: readonly string[]): URL {
  const url = publicHttpsUrl(input);
  if (!allowedOrigins.includes(url.origin)) throw new PaymentError("UNTRUSTED_PROVIDER_URL");
  return url;
}
export function liveTransport(allowedOrigins: readonly string[] | null): Transport {
  return async (input) => {
    const url = allowedOrigins ? trustedUrl(input.url, allowedOrigins) : publicHttpsUrl(input.url);
    const signal = AbortSignal.timeout(8000);
    let addresses;
    try { addresses = await Promise.race([lookup(url.hostname, { all: true }), new Promise<never>((_resolve, reject) => { signal.addEventListener("abort", () => reject(new TransportError()), { once: true }); })]); }
    catch { throw new TransportError(); }
    // IPv4-only transport: reject mixed/private answers and pin the inspected address against rebinding.
    if (!addresses.length || addresses.some((item) => item.family === 4 && !publicIPv4(item.address))) throw new PaymentError("UNTRUSTED_PROVIDER_DNS");
    const address = addresses.find((item) => item.family === 4 && publicIPv4(item.address));
    if (!address) throw new PaymentError("UNSUPPORTED_PROVIDER_DNS");
    return new Promise((resolve, reject) => {
      const req = httpsRequest(url, {
        family: 4, method: input.method ?? "GET", headers: { Accept: "application/json", ...input.headers },
        signal,
        lookup: (_hostname, _options, callback) => callback(null, address.address, 4),
      }, (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) { res.destroy(); reject(new TransportError()); return; }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 256 * 1024) { res.destroy(); reject(new PaymentError("PROVIDER_RESPONSE_TOO_LARGE")); }
          else chunks.push(chunk);
        });
        res.on("error", () => reject(new TransportError()));
        res.on("end", () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
          catch { reject(new PaymentError("INVALID_PROVIDER_JSON")); }
        });
      });
      req.on("error", () => reject(new TransportError()));
      req.end(input.body);
    });
  };
}
