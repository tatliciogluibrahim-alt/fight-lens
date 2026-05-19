#!/usr/bin/env node
/**
 * scripts/audit/predictions.ts
 *
 * Loads every normalized event + every locked prediction file, runs the
 * production model code paths, and asserts internal consistency across:
 *
 *   - predictedWinner from the view model
 *   - The Call scenario's fighterLabel (must equal predictedWinner)
 *   - Live Path scenario's fighterLabel (must equal predictedLoser)
 *   - Locked-call result correctness (uses predictedWinner, not live re-run)
 *   - Public Model Record does not mix in backtest reconstructions
 *
 * Failures print to stdout with the offending fightId and reason. Exits
 * non-zero if any check fails.
 *
 * Run: npm run audit:predictions
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

import { buildFightShapeModel } from "@/lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "@/lib/fight-outcome-model/model";
import { pinToLockedPrediction } from "@/lib/fight-outcome-model/pin-to-locked";
import { buildPredictionViewModel } from "@/lib/predictionViewModel";
import {
  getAllPredictions,
  getLockedPredictions,
  getHistoricalBacktestReconstructions,
  getAccuracyMetrics,
} from "@/lib/accuracy";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

interface AuditFinding {
  fightId: string;
  event: string;
  severity: "error" | "warning";
  check: string;
  detail: string;
}

const findings: AuditFinding[] = [];

function fail(fight: SourcedFight, event: string, check: string, detail: string) {
  findings.push({ fightId: fight.id, event, severity: "error", check, detail });
}

function warn(fight: SourcedFight, event: string, check: string, detail: string) {
  findings.push({ fightId: fight.id, event, severity: "warning", check, detail });
}

function loadEvents(): SourcedEvent[] {
  const dir = path.join(REPO_ROOT, "data/normalized/events");
  const out: SourcedEvent[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
    } catch {
      // skip malformed JSON — caught elsewhere
    }
  }
  return out;
}

function indexLockedByFightId(): Map<string, PredictionRecord> {
  const map = new Map<string, PredictionRecord>();
  for (const r of getAllPredictions()) {
    map.set(r.fightId, r);
  }
  return map;
}

function auditFight(event: SourcedEvent, fight: SourcedFight, predRecord: PredictionRecord | null) {
  const shapeModel = buildFightShapeModel(fight);
  const liveOutcome = buildFightOutcomeModel(fight, shapeModel);
  const outcome = predRecord && fight.status === "completed"
    ? pinToLockedPrediction(liveOutcome, predRecord)
    : liveOutcome;

  const vm = buildPredictionViewModel({
    eventId: null,
    fight,
    outcomeModel: outcome,
    lockedPrediction: predRecord,
  });

  // Skip "pending" view models — they have no winner to check
  if (!vm.predictedWinner || !vm.predictedLoser) return;

  // ── Check 1: probabilities sum to ~100 ──────────────────────────────────────
  const sum = vm.fighterA.winProbability + vm.fighterB.winProbability;
  if (Math.abs(sum - 100) > 1) {
    fail(fight, event.event.name, "probabilities-sum", `${vm.fighterA.winProbability}% + ${vm.fighterB.winProbability}% = ${sum}, should sum to ~100`);
  }

  // ── Check 2: predictedWinner has higher probability than predictedLoser ─────
  if (vm.predictedWinner.winProbability < vm.predictedLoser.winProbability) {
    fail(fight, event.event.name, "winner-has-higher-prob", `predictedWinner ${vm.predictedWinner.name} (${vm.predictedWinner.winProbability}%) < predictedLoser ${vm.predictedLoser.name} (${vm.predictedLoser.winProbability}%)`);
  }

  // ── Check 3: predictedWinner and predictedLoser are different fighters ──────
  if (vm.predictedWinner.id === vm.predictedLoser.id) {
    fail(fight, event.event.name, "winner-loser-distinct", `predictedWinner.id === predictedLoser.id (${vm.predictedWinner.id})`);
  }

  // ── Check 4: livePathFighter equals predictedLoser (default convention) ─────
  if (vm.livePathFighter && vm.livePathFighter.id !== vm.predictedLoser.id) {
    fail(fight, event.event.name, "live-path-is-loser", `livePathFighter (${vm.livePathFighter.name}) !== predictedLoser (${vm.predictedLoser.name})`);
  }

  // ── Check 5: scenarios alignment ────────────────────────────────────────────
  const lean = vm.scenarios.find((s) => s.id === "lean");
  const upset = vm.scenarios.find((s) => s.id === "upset");
  if (lean && lean.fighterLabel !== vm.predictedWinner.name) {
    fail(fight, event.event.name, "the-call-card-aligned", `"the call" card names "${lean.fighterLabel}" but predictedWinner is "${vm.predictedWinner.name}"`);
  }
  if (upset && upset.fighterLabel !== vm.predictedLoser.name) {
    fail(fight, event.event.name, "live-path-card-aligned", `"live path" card names "${upset.fighterLabel}" but predictedLoser is "${vm.predictedLoser.name}"`);
  }

  // ── Check 6: locked-call result correctness uses predictedWinner ────────────
  if (vm.isScored && vm.actualWinner && vm.modelCorrect !== null) {
    const expected = vm.predictedWinner.id === vm.actualWinner.id;
    if (vm.modelCorrect !== expected) {
      fail(fight, event.event.name, "result-correctness", `modelCorrect (${vm.modelCorrect}) inconsistent with predictedWinner=${vm.predictedWinner.name} vs actualWinner=${vm.actualWinner.name}`);
    }
  }

  // ── Check 7: missing logged call should not be treated as scored ────────────
  if (vm.isScored && vm.sourceType === "currentModel") {
    fail(fight, event.event.name, "scoring-requires-source", `fight is marked scored but sourceType is currentModel (no locked or backtest record)`);
  }

  // ── Check 8: pending sourceType should not have predictedWinner ─────────────
  // (already enforced by buildPredictionViewModel — defensive check)
  if (vm.sourceType === "pending" && vm.predictedWinner) {
    fail(fight, event.event.name, "pending-no-winner", `sourceType is pending but predictedWinner is set`);
  }

  // ── Check 9: backtest records must be marked as historicalBacktest ─────────
  if (predRecord?.isBacktestReconstruction && vm.sourceType !== "historicalBacktest" && vm.sourceType !== "pending") {
    fail(fight, event.event.name, "backtest-source-type", `prediction record is isBacktestReconstruction=true but sourceType is ${vm.sourceType}`);
  }
}

// ─── Global checks (not per-fight) ────────────────────────────────────────────

function auditGlobalSeparation() {
  // Public accuracy metrics must NOT include historical backtest records.
  const locked = getLockedPredictions();
  const backtests = getHistoricalBacktestReconstructions();
  const lockedIds = new Set(locked.map((r) => r.fightId));
  for (const r of backtests) {
    if (lockedIds.has(r.fightId)) {
      findings.push({
        fightId: r.fightId,
        event: r.event,
        severity: "error",
        check: "record-vs-backtest-separation",
        detail: `prediction record appears in both locked and historical backtest sets`,
      });
    }
  }

  // getAccuracyMetrics should be computed from locked only — assert by
  // checking the resolvedCount equals the count of locked records with outcomes.
  const metrics = getAccuracyMetrics();
  const expectedResolved = locked.filter((r) => r.outcome !== null).length;
  if (metrics.resolvedCount !== expectedResolved) {
    findings.push({
      fightId: "(global)",
      event: "(global)",
      severity: "error",
      check: "accuracy-metrics-locked-only",
      detail: `getAccuracyMetrics().resolvedCount=${metrics.resolvedCount} but locked records with outcomes=${expectedResolved}. Backtest rows may be leaking into public metrics.`,
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("\n=== Fight Lens Prediction Audit ===\n");

  const events = loadEvents();
  console.log(`Loaded ${events.length} normalized events`);
  const predById = indexLockedByFightId();
  console.log(`Loaded ${predById.size} prediction records`);

  let fightCount = 0;
  for (const event of events) {
    for (const fight of event.fights) {
      auditFight(event, fight, predById.get(fight.id) ?? null);
      fightCount++;
    }
  }
  console.log(`Audited ${fightCount} fights\n`);

  auditGlobalSeparation();

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("PASS — no contradictions detected.");
    return;
  }

  if (errors.length > 0) {
    console.log(`FAIL — ${errors.length} error${errors.length === 1 ? "" : "s"}:\n`);
    for (const f of errors) {
      console.log(`  [${f.check}] ${f.event} / ${f.fightId}`);
      console.log(`    ${f.detail}`);
    }
  }
  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
    for (const f of warnings) {
      console.log(`  [${f.check}] ${f.event} / ${f.fightId}: ${f.detail}`);
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
