export function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    const finish = (error) => {
      clearTimeout(timeout);
      child.stdout.off("data", ready);
      child.off("error", failed);
      child.off("exit", exited);
      if (error) reject(error);
      else resolve();
    };
    const ready = (chunk) => {
      output = `${output}${chunk}`.slice(-4_000);
      if (/Ready in \d+(?:\.\d+)?(?:ms|s|min)\b/.test(output)) finish();
    };
    const failed = (error) => finish(error);
    const exited = (code) => finish(new Error(`Standalone server exited with code ${code}.`));
    const timeout = setTimeout(() => finish(new Error("Standalone server did not become ready within 30 seconds.")), 30_000);
    child.stdout.on("data", ready);
    child.once("error", failed);
    child.once("exit", exited);
  });
}
