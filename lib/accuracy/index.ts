/**
 * Accuracy index — imports all prediction records and exposes computed metrics.
 *
 * To add a new prediction:
 *   1. Drop a JSON file matching PredictionRecord schema into data/predictions/
 *   2. Import it here and add to `allRecords`
 *   3. Once the fight resolves, add the `outcome` block and recommit
 */

import islamJdm from "@/data/predictions/islam-jdm.json";
import { computeAccuracyMetrics } from "./calculator";
import type { AccuracyMetrics, PredictionRecord } from "./types";

const allRecords: PredictionRecord[] = [
  islamJdm as PredictionRecord,
  // Add new predictions here as fights approach:
  // chimaevStrickland as PredictionRecord,
  // vanTaira as PredictionRecord,
];

export function getAllPredictions(): PredictionRecord[] {
  return allRecords;
}

export function getAccuracyMetrics(): AccuracyMetrics {
  return computeAccuracyMetrics(allRecords);
}
