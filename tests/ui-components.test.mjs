import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});


test("supports multi-select profile answers and multiple category deep surveys", async () => {
  const {
    GENERAL_SURVEY,
    getSurveySteps,
    nextSurveyAnswer,
  } = await vite.ssrLoadModule("/lib/user-model-survey.ts");

  const environment = GENERAL_SURVEY.find((step) => step.id === "environment");
  const place = environment.questions.find((question) => question.id === "place");
  assert.equal(place.multiple, true);

  let answer = nextSurveyAnswer(place, undefined, "집");
  answer = nextSurveyAnswer(place, answer, "사무실");
  assert.deepEqual(answer, ["집", "사무실"]);
  answer = nextSurveyAnswer(place, answer, "복합");
  assert.deepEqual(answer, ["복합"]);
  answer = nextSurveyAnswer(place, answer, "복합");
  assert.deepEqual(answer, []);

  const stepIds = getSurveySteps({ category: ["노트북", "전동공구"] }).map((step) => step.id);
  assert.ok(stepIds.includes("category-laptop"));
  assert.ok(stepIds.includes("category-tool"));
});


test("every profile survey question has complete English copy", async () => {
  const { GENERAL_SURVEY, CATEGORY_SURVEYS } = await vite.ssrLoadModule("/lib/user-model-survey.ts");
  const { hasCompleteEnglishSurveyCopy } = await vite.ssrLoadModule("/lib/user-model-locale.ts");
  const questions = [...GENERAL_SURVEY, ...Object.values(CATEGORY_SURVEYS)].flatMap((step) => step.questions);
  assert.ok(questions.length >= 50);
  for (const question of questions) assert.equal(hasCompleteEnglishSurveyCopy(question), true, question.id);
});
