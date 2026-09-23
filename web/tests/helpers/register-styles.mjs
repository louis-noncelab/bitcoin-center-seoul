import { registerHooks } from "node:module";

// Static markup tests check HTML contracts; Playwright covers the real styles.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    return nextLoad(url, context);
  },
});
