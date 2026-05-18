/**
 * Accuracy index — imports all prediction records and exposes computed metrics.
 *
 * To add a new prediction:
 *   1. Drop a JSON file matching PredictionRecord schema into data/predictions/
 *   2. Import it here and add to `allRecords`
 *   3. Once the fight resolves, add the `outcome` block and recommit
 */

import islamJdm from "@/data/predictions/islam-jdm.json";
import chimaevStrickland from "@/data/predictions/chimaev-strickland.json";
import vanTaira from "@/data/predictions/van-taira.json";
import volkovCortes from "@/data/predictions/volkov-cortes.json";
import bradyBuckley from "@/data/predictions/brady-buckley.json";
import greenStephens from "@/data/predictions/green-stephens.json";
import gautierDiaz from "@/data/predictions/gautier-diaz.json";
import alvarezAmosov from "@/data/predictions/alvarez-amosov.json";
import dawsonRebecki from "@/data/predictions/dawson-rebecki.json";
import millerGordon from "@/data/predictions/miller-gordon.json";
import kopylovTulio from "@/data/predictions/kopylov-tulio.json";
import sabatiniGomis from "@/data/predictions/sabatini-gomis.json";
import susurkaevSantos from "@/data/predictions/susurkaev-santos.json";
import carpenterOchoa from "@/data/predictions/carpenter-ochoa.json";
import { computeAccuracyMetrics } from "./calculator";
import type { AccuracyMetrics, PredictionRecord } from "./types";

const allRecords: PredictionRecord[] = [
  islamJdm as PredictionRecord,
  chimaevStrickland as PredictionRecord,
  vanTaira as PredictionRecord,
  volkovCortes as PredictionRecord,
  bradyBuckley as PredictionRecord,
  greenStephens as PredictionRecord,
  gautierDiaz as PredictionRecord,
  alvarezAmosov as PredictionRecord,
  dawsonRebecki as PredictionRecord,
  millerGordon as PredictionRecord,
  kopylovTulio as PredictionRecord,
  sabatiniGomis as PredictionRecord,
  susurkaevSantos as PredictionRecord,
  carpenterOchoa as PredictionRecord,
];

export function getAllPredictions(): PredictionRecord[] {
  return allRecords;
}

export function getAccuracyMetrics(): AccuracyMetrics {
  return computeAccuracyMetrics(allRecords);
}

export function getPredictionByFightId(fightId: string): PredictionRecord | null {
  return allRecords.find((r) => r.fightId === fightId) ?? null;
}
