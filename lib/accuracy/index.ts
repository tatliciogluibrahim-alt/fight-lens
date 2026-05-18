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
// UFC 329: McGregor vs. Holloway 2
import mcgregorHolloway from "@/data/predictions/mcgregor-holloway.json";
import saintDenisPimblett from "@/data/predictions/saint-denis-pimblett.json";
import sandhagenBautista from "@/data/predictions/sandhagen-bautista.json";
import royvalKavanagh from "@/data/predictions/royval-kavanagh.json";
import stevesonEllison from "@/data/predictions/steveson-ellison.json";
import whittakerKrylov from "@/data/predictions/whittaker-krylov.json";
import rileyKamaka from "@/data/predictions/riley-kamaka.json";
import pinasAlmeida from "@/data/predictions/pinas-almeida.json";
import garbrandtYanez from "@/data/predictions/garbrandt-yanez.json";
import cortezWang from "@/data/predictions/cortez-wang.json";
import osbourneDurden from "@/data/predictions/osbourne-durden.json";
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
  // UFC 329
  mcgregorHolloway as PredictionRecord,
  saintDenisPimblett as PredictionRecord,
  sandhagenBautista as PredictionRecord,
  royvalKavanagh as PredictionRecord,
  stevesonEllison as PredictionRecord,
  whittakerKrylov as PredictionRecord,
  rileyKamaka as PredictionRecord,
  pinasAlmeida as PredictionRecord,
  garbrandtYanez as PredictionRecord,
  cortezWang as PredictionRecord,
  osbourneDurden as PredictionRecord,
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
