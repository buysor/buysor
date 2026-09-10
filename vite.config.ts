import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import { sites } from "./build/sites-vite-plugin";

const isCodexSeatbeltSandbox =
  process.env.CODEX_SANDBOX === "seatbelt";

/**
 * vinext production hydration workaround.
 *
 * vinext runtime shims가 여러 client chunk로 갈라지면서
 * circular import가 생기면 SSR HTML은 보이지만 React hydration이
 * 시작되지 않아 onClick/useState 등이 전부 죽을 수 있다.
 *
 * shim들을 하나의 chunk로 묶어서 그 cycle을 제거한다.
 */
const vinextHydrationFix: Plugin = {
  name: "vinext-shims-single-chunk",

  configEnvironment(name) {
    if (name !== "client") return;

    return {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "vinext-shims",
                  test: /[\\/]node_modules[\\/]vinext[\\/]dist[\\/]shims[\\/]/,
                },
              ],
            },
          },
        },
      },
    };
  },
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],

      ...(isCodexSeatbeltSandbox
        ? {
            watch: {
              useFsEvents: false,
              usePolling: true,
            },
          }
        : {}),
    },

    plugins: [
      vinextHydrationFix,

      vinext(),

      sites(),

      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
        inspectorPort: false,
      }),
    ],
  };
});
