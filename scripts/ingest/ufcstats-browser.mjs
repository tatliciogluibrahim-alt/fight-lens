#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────────────────────
// UFCStats headless fetch layer (transport only — no parsing lives here)
//
// Why this exists:
// As of July 2026 ufcstats.com serves a JavaScript "proof-of-work" anti-bot
// gate to plain HTTP clients. A raw `fetch()` gets a ~3KB stub that says
// "Checking your browser… This site requires JavaScript" and contains zero
// fight rows. The real page only appears after the browser runs the challenge
// JS, which computes a SHA256 nonce, sets a cookie, and reloads.
//
// This module launches a real headless Chromium (via Playwright), lets that
// JS run, waits for the real content to appear, and hands the settled HTML
// back to the existing cheerio parsers unchanged. It is a drop-in replacement
// for the plain-fetch transport — nothing about parsing or caching changes.
//
// Cookie reuse: the challenge is solved ONCE per run. We keep a single browser
// context alive for the whole run, so every page after the first reuses the
// cookie and skips the challenge (typically ~0.5s per page instead of ~1.5s).
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from "playwright";

// A real Chromium user-agent. The challenge is computational, not a
// headless-detection trap, so we do not need stealth plugins — a normal
// headless browser solves it. This UA just keeps us looking like a browser.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

// Selector that only exists on a REAL UFCStats page (event, fighter, or fight),
// never on the challenge stub. Event and fighter pages carry a details table;
// fight-detail pages carry fighter blocks. Waiting for any one of these is our
// signal that the challenge has cleared and the real DOM is present.
const DEFAULT_CONTENT_SELECTOR =
  ".b-fight-details__table, .b-fight-details__person";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 1;

// Module-level singletons. Launched lazily on first fetch, reused for the whole
// run, and torn down by closeBrowser() at the end of the script.
let browser = null;
let context = null;

/**
 * Detects the anti-bot challenge stub. Real pages never contain this text and
 * always contain the content selector, so this only matches the gate page.
 */
export function looksLikeChallenge(html) {
  if (!html) return true;
  const isStub =
    html.includes("Checking your browser") ||
    html.includes("This site requires JavaScript");
  const hasRealContent =
    html.includes("b-fight-details__table") ||
    html.includes("b-fight-details__person");
  return isStub && !hasRealContent;
}

async function getContext() {
  if (context) return context;

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    userAgent: BROWSER_USER_AGENT,
    viewport: { width: 1280, height: 900 },
    // Skip downloading images/fonts — we only need the HTML. Faster and lighter.
    serviceWorkers: "block",
  });
  return context;
}

/**
 * Fetch a UFCStats URL through a real headless browser, letting the anti-bot
 * challenge resolve, and return the settled HTML.
 *
 * @param {string} url - Absolute UFCStats URL to load.
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs] - Max wait for the challenge + real content.
 * @param {number} [opts.retries]   - Extra attempts if the first fails.
 * @param {string} [opts.contentSelector] - Selector that proves the real page.
 * @returns {Promise<{ body: string, status: number, contentType: string }>}
 */
export async function fetchViaBrowser(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const contentSelector = opts.contentSelector ?? DEFAULT_CONTENT_SELECTOR;

  const ctx = await getContext();

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const page = await ctx.newPage();
    try {
      // Load the page. The challenge stub may hard-reload itself once it has
      // solved the nonce; that can abort the in-flight navigation, which is
      // expected, so we swallow goto errors and rely on waitForSelector below
      // as the real success signal.
      const response = await page
        .goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs })
        .catch(() => null);

      // Wait for the real content to appear. If the challenge never clears,
      // this throws on timeout and we fall through to the retry / loud error.
      await page.waitForSelector(contentSelector, { timeout: timeoutMs });

      const body = await page.content();

      // Belt-and-suspenders: never hand a challenge stub to the parsers.
      if (looksLikeChallenge(body)) {
        throw new Error("Real content selector matched but page still looks like the challenge stub.");
      }

      const status = response?.status?.() ?? 200;
      const contentType =
        response?.headers?.()["content-type"] ?? "text/html;charset=utf-8";

      return { body, status, contentType };
    } catch (error) {
      lastError = error;
      // Next attempt gets a fresh page (but the same context, so a cookie that
      // was already solved on a prior page is still reused).
    } finally {
      await page.close().catch(() => {});
    }
  }

  // Loud, specific failure. The founder should never see empty data written —
  // if the challenge did not resolve, we throw here and the caller aborts.
  throw new Error(
    `Headless fetch failed for ${url} after ${retries + 1} attempt(s): ${
      lastError?.message ?? "content selector never appeared"
    }. The UFCStats anti-bot challenge did not resolve (site may be down, slow, ` +
      `or the challenge changed). No data was written.`
  );
}

/**
 * Close the shared browser at the end of a run. Safe to call even if no browser
 * was ever launched (no-op in that case).
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    context = null;
  }
}
