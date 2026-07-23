import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const [html, css, app] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
]);

test("contains the milestone-one screen inventory", () => {
  const requiredScreens = [
    "today",
    "channel",
    "direct-message",
    "company-map",
    "living-mission-map",
    "start-work-session",
    "active-work-session",
    "refill-context",
    "outcome-review",
    "company-memory",
  ];

  for (const screen of requiredScreens) {
    assert.match(app, new RegExp(`data-prototype-screen=["']${screen}["']`), `missing ${screen}`);
  }
});

test("models every critical lifecycle and recovery state", () => {
  const lifecycleStates = [
    "empty",
    "loading",
    "active",
    "blocked",
    "offline",
    "permission-denied",
    "provider-disconnected",
    "failed",
    "paused",
    "completed",
    "stale",
  ];

  for (const state of lifecycleStates) {
    assert.match(app, new RegExp(`["']${state}["']`), `missing ${state}`);
  }
  assert.match(app, /data-action="return-live"/);
  assert.match(html, /data-action="restore-connection"/);
});

test("preserves the complete conversation-to-knowledge vertical slice", () => {
  const requiredActions = [
    "start-claude",
    "begin-session",
    "refill-context",
    "confirm-refill",
    "review-outcome",
    "accept-outcome",
  ];

  for (const action of requiredActions) {
    assert.match(app, new RegExp(`data-action=["']${action}["']`), `missing ${action}`);
  }
  assert.match(app, /state\.knowledgeVerified = true/);
  assert.match(app, /Context Capsule v4/);
  assert.match(app, /Context resolved/);
  assert.match(app, /Accepted by Astro/);
  assert.match(app, /Human verified/);
});

test("makes privacy and agent permissions visible before action", () => {
  assert.match(app, /Private DM with Thanh/);
  assert.match(app, /Excluded by default/);
  assert.match(app, /Advise only/);
  assert.match(app, /Prepare drafts/);
  assert.match(app, /Act after approval/);
  assert.match(app, /Owner Astro/);
  assert.match(app, /Local access/);
  assert.match(app, /Tools/);
});

test("includes keyboard, reduced-motion, and screen-reader affordances", () => {
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label=/);
  assert.match(app, /aria-modal="true"/);
  assert.match(app, /Accessible list/);
  assert.match(app, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.visually-hidden/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("remains dependency-free and locally inspectable", () => {
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//);
  assert.doesNotMatch(css, /@import\s+url/);
  assert.match(html, /src="app\.js"/);
  assert.match(html, /href="styles\.css"/);
});
