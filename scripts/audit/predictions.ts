#!/usr/bin/env node
/**
 * Prediction consistency audit.
 *
 * Checks every routeable fight page from the event registry against the same
 * canonical view model used by the fight page and matchup rows.
 */

import { buildPredictionViewModelBundle, getPredictionRecordCall } from "@/lib/predictionViewModel";
import {
  getAccuracyMetrics,
  getAllPredictions,
  getHistoricalBacktestReconstructions,
  getLockedPredictions,
} from "@/lib/accuracy";
import { getAllEvents } from "@/lib/events/registry";
import { resolveNamedCallThreshold } from "@/lib/predictionThresholds";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

interface AuditFinding {
  route: string;
  event: string;
  fightId: string;
  severity: "error" | "warning";
  check: string;
  detail: string;
}

const findings: AuditFinding[] = [];
const failedRoutes = new Set<string>();

function routeFor(eventId: string, fightId: string) {
  return `/events/${eventId}/${fightId}`;
}

function fail(route: string, event: string, fightId: string, check: string, detail: string) {
  failedRoutes.add(route);
  findings.push({ route, event, fightId, severity: "error", check, detail });
}

function predictionByFightId(): Map<string, PredictionRecord> {
  const map = new Map<string, PredictionRecord>();
  for (const record of getAllPredictions()) {
    map.set(record.fightId, record);
  }
  return map;
}

function callKeyFromVm(vm: ReturnType<typeof buildPredictionViewModelBundle>["viewModel"]) {
  return [
    vm.callState,
    vm.predictedWinner?.name ?? "none",
    vm.winnerProbability ?? "none",
    vm.displayedCallLabel,
  ].join("|");
}

function callKeyFromRecord(record: PredictionRecord) {
  const call = getPredictionRecordCall(record);
  return [
    call.hasNamedCall ? "lockedCall" : "noLean",
    call.predictedWinnerName ?? "none",
    call.winnerProbability ?? "none",
    call.displayedCallLabel,
  ].join("|");
}

function auditRoute(event: SourcedEvent, fight: SourcedFight, record: PredictionRecord | null) {
  const route = routeFor(event.event.id, fight.id);

  let bundle: ReturnType<typeof buildPredictionViewModelBundle>;
  try {
    bundle = buildPredictionViewModelBundle({
      eventId: event.event.id,
      fight,
      lockedPrediction: record,
    });
  } catch (error) {
    fail(route, event.event.name, fight.id, "route-builds", error instanceof Error ? error.message : String(error));
    return;
  }

  const { viewModel: vm } = bundle;
  const sum = vm.fighterA.winProbability + vm.fighterB.winProbability;

  if (Math.abs(sum - 100) > 1) {
    fail(route, event.event.name, fight.id, "probabilities-sum", `${vm.fighterA.winProbability}% + ${vm.fighterB.winProbability}% = ${sum}`);
  }

  const isDataPending = vm.callState === "insufficientData" || vm.callState === "pending";
  // Resolve the threshold for the version this call was locked under (v0.2 → 52,
  // v0.3 → 58), so a 56% v0.2 call correctly stays a named call.
  const namedThreshold = resolveNamedCallThreshold(vm.modelVersion);
  if (!isDataPending && Math.max(vm.fighterA.winProbability, vm.fighterB.winProbability) < namedThreshold) {
    if (vm.predictedWinner || vm.callState !== "noLean" || vm.displayedCallLabel !== "Too close to call") {
      fail(route, event.event.name, fight.id, "no-lean-threshold", `top probability below ${namedThreshold}% produced callState=${vm.callState}, winner=${vm.predictedWinner?.name ?? "none"}, label="${vm.displayedCallLabel}"`);
    }
  }

  if (vm.fighterA.winProbability === vm.fighterB.winProbability && vm.predictedWinner) {
    fail(route, event.event.name, fight.id, "tie-no-default-winner", `tied probabilities defaulted to ${vm.predictedWinner.name}`);
  }

  if (vm.callState === "noLean") {
    const lean = vm.scenarios.find((scenario) => scenario.id === "lean");
    const livePath = vm.scenarios.find((scenario) => scenario.id === "upset");
    if (vm.predictedWinner || vm.predictedLoser || vm.livePathFighter) {
      fail(route, event.event.name, fight.id, "no-lean-no-fighters", `noLean has winner=${vm.predictedWinner?.name ?? "none"}, loser=${vm.predictedLoser?.name ?? "none"}, livePath=${vm.livePathFighter?.name ?? "none"}`);
    }
    if (lean?.fighterLabel) {
      fail(route, event.event.name, fight.id, "no-lean-call-card-copy", `The Call card names ${lean.fighterLabel} during noLean`);
    }
    if (livePath?.fighterLabel || livePath?.title !== "paths to watch") {
      fail(route, event.event.name, fight.id, "no-lean-live-path-copy", `Live Path card during noLean title="${livePath?.title ?? "missing"}" fighter="${livePath?.fighterLabel ?? "none"}"`);
    }
    if (vm.methodLean && vm.methodLeanNote !== "Method lean is directional. Winner call is too close.") {
      fail(route, event.event.name, fight.id, "no-lean-method-secondary", `method note="${vm.methodLeanNote}"`);
    }
  }

  if (vm.isNamedCall && vm.predictedWinner && vm.predictedLoser) {
    const lean = vm.scenarios.find((scenario) => scenario.id === "lean");
    const livePath = vm.scenarios.find((scenario) => scenario.id === "upset");
    if (lean?.fighterLabel !== vm.predictedWinner.name) {
      fail(route, event.event.name, fight.id, "the-call-card-aligned", `The Call names "${lean?.fighterLabel ?? "none"}" but predictedWinner is "${vm.predictedWinner.name}"`);
    }
    if (livePath?.fighterLabel !== vm.predictedLoser.name) {
      fail(route, event.event.name, fight.id, "live-path-card-aligned", `Live Path names "${livePath?.fighterLabel ?? "none"}" but predictedLoser is "${vm.predictedLoser.name}"`);
    }
    if (vm.livePathFighter?.id !== vm.predictedLoser.id) {
      fail(route, event.event.name, fight.id, "live-path-fighter-is-loser", `livePathFighter=${vm.livePathFighter?.name ?? "none"}, predictedLoser=${vm.predictedLoser.name}`);
    }
  }

  if (record) {
    if (callKeyFromVm(vm) !== callKeyFromRecord(record)) {
      fail(route, event.event.name, fight.id, "record-fight-page-match", `record=${callKeyFromRecord(record)} page=${callKeyFromVm(vm)}`);
    }

    if (vm.fighterA.winProbability !== record.prediction.fighterAWinProbability || vm.fighterB.winProbability !== record.prediction.fighterBWinProbability) {
      fail(route, event.event.name, fight.id, "locked-probabilities-pinned", `record=${record.prediction.fighterAWinProbability}/${record.prediction.fighterBWinProbability}, page=${vm.fighterA.winProbability}/${vm.fighterB.winProbability}`);
    }

    if (record.outcome && !record.isBacktestReconstruction && vm.sourceType !== "lockedCall") {
      fail(route, event.event.name, fight.id, "scored-locked-source", `scored locked fight sourceType=${vm.sourceType}`);
    }

    if (record.outcome && record.outcome.winner !== "draw" && record.outcome.winner !== "nc") {
      const recordCall = getPredictionRecordCall(record);
      const expectedCorrect = recordCall.predictedSide ? recordCall.predictedSide === record.outcome.winner : null;
      if (vm.modelCorrect !== expectedCorrect) {
        fail(route, event.event.name, fight.id, "result-correctness-uses-locked-call", `expected=${expectedCorrect}, vm.modelCorrect=${vm.modelCorrect}`);
      }
    }
  }
}

function auditGlobalSeparation() {
  const locked = getLockedPredictions();
  const backtests = getHistoricalBacktestReconstructions();

  for (const record of locked) {
    if (record.isBacktestReconstruction) {
      findings.push({
        route: "/record",
        event: record.event,
        fightId: record.fightId,
        severity: "error",
        check: "public-record-no-backtests",
        detail: "Historical backtest reconstruction appears in public locked calls.",
      });
      failedRoutes.add("/record");
    }
  }

  const lockedIds = new Set(locked.map((record) => record.fightId));
  for (const record of backtests) {
    if (lockedIds.has(record.fightId)) {
      findings.push({
        route: "/record",
        event: record.event,
        fightId: record.fightId,
        severity: "error",
        check: "record-vs-backtest-separation",
        detail: "Prediction record appears in both locked and historical backtest sets.",
      });
      failedRoutes.add("/record");
    }
  }

  const metrics = getAccuracyMetrics();
  const expectedResolved = locked.filter((record) => {
    if (!record.outcome || record.outcome.winner === "draw" || record.outcome.winner === "nc") return false;
    return getPredictionRecordCall(record).hasNamedCall;
  }).length;
  if (metrics.resolvedCount !== expectedResolved) {
    findings.push({
      route: "/record",
      event: "(global)",
      fightId: "(global)",
      severity: "error",
      check: "accuracy-metrics-locked-named-only",
      detail: `getAccuracyMetrics().resolvedCount=${metrics.resolvedCount}, expected locked named scored calls=${expectedResolved}.`,
    });
    failedRoutes.add("/record");
  }
}

function main() {
  console.log("\n=== Fight Lens Prediction Audit ===\n");

  const events = getAllEvents();
  const predictions = predictionByFightId();
  const routes = events.flatMap((event) =>
    event.fights.map((fight) => ({ event, fight, route: routeFor(event.event.id, fight.id) })),
  );

  for (const { event, fight } of routes) {
    auditRoute(event, fight, predictions.get(fight.id) ?? null);
  }
  auditGlobalSeparation();

  const errors = findings.filter((finding) => finding.severity === "error");
  const routesFailed = failedRoutes.size;
  const routesPassed = routes.length - routes.filter(({ route }) => failedRoutes.has(route)).length;

  console.log(`Total routeable fight pages checked: ${routes.length}`);
  console.log(`Routes passed: ${routesPassed}`);
  console.log(`Routes failed: ${routesFailed}\n`);

  if (errors.length === 0) {
    console.log("PASS — no prediction contradictions detected.");
    return;
  }

  console.log(`FAIL — ${errors.length} error${errors.length === 1 ? "" : "s"}:\n`);
  for (const finding of errors) {
    console.log(`  [${finding.check}] ${finding.route}`);
    console.log(`    ${finding.detail}`);
  }

  process.exit(1);
}

main();
