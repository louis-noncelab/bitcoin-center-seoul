import { open } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { createPasswordHash } from "../src/server/events/password";

const help = `Usage: npm run admin:password -- --output /absolute/path/admin-password.env [--from-env]
Reads an existing password without echo and writes only its scrypt verifier (mode 0600).
--from-env consumes the inherited ADMIN_PASSWORD; it never opens an environment file.
The output file must not exist. No password or verifier is printed.`;

async function promptPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) throw new Error("Use a terminal or --from-env.");
  const hidden = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const terminal = createInterface({ input: process.stdin, output: hidden, terminal: true });
  const abort = new AbortController();
  terminal.on("SIGINT", () => abort.abort());
  try {
    process.stderr.write("기존 관리자 비밀번호: ");
    const first = await terminal.question("", { signal: abort.signal });
    process.stderr.write("\n비밀번호 확인: ");
    const second = await terminal.question("", { signal: abort.signal });
    if (first !== second) throw new Error("Passwords do not match.");
    return first;
  } finally {
    process.stderr.write("\n");
    terminal.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === "--help")) {
    console.log(help);
    return;
  }
  if (args[0] !== "--output" || !args[1] || !isAbsolute(args[1])
    || args.length > 3 || (args.length === 3 && args[2] !== "--from-env")) throw new Error(help);
  const password = args[2] === "--from-env" ? process.env.ADMIN_PASSWORD : await promptPassword();
  delete process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("An existing password is required.");
  const encoded = await createPasswordHash(password);
  const output = await open(args[1], "wx", 0o600);
  try {
    await output.writeFile(`ADMIN_PASSWORD_HASH='${encoded}'\n`);
    await output.sync();
  } finally {
    await output.close();
  }
  console.log("Password verifier saved. Configure ADMIN_PASSWORD_HASH and remove ADMIN_PASSWORD from the application environment.");
}

try { await main(); }
catch (error) {
  const known = error instanceof Error && !('code' in error) ? error.message : "Cannot create the output file; choose a new private path.";
  console.error(known);
  process.exitCode = 1;
}
