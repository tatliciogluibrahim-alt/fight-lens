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
// UFC Freedom 250: Topuria vs. Gaethje
import topuriaGaethje from "@/data/predictions/topuria-gaethje.json";
import pereiraGane from "@/data/predictions/pereira-gane.json";
import oMalleyZahabi from "@/data/predictions/o-malley-zahabi.json";
import hokitLewis from "@/data/predictions/hokit-lewis.json";
import ruffyChandler from "@/data/predictions/ruffy-chandler.json";
import nickalDaukaus from "@/data/predictions/nickal-daukaus.json";
import lopesGarcia from "@/data/predictions/lopes-garcia.json";
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
// UFC Vegas 119: Kape vs. Horiguchi (modeled fights only; 2 bouts data-pending)
import kapeHoriguchi from "@/data/predictions/kape-horiguchi.json";
import cutelabaStirling from "@/data/predictions/cutelaba-stirling.json";
import oliveiraFili from "@/data/predictions/oliveira-fili.json";
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
  // UFC Freedom 250
  topuriaGaethje as PredictionRecord,
  pereiraGane as PredictionRecord,
  oMalleyZahabi as PredictionRecord,
  hokitLewis as PredictionRecord,
  ruffyChandler as PredictionRecord,
  nickalDaukaus as PredictionRecord,
  lopesGarcia as PredictionRecord,
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
  // UFC Vegas 119
  kapeHoriguchi as PredictionRecord,
  cutelabaStirling as PredictionRecord,
  oliveiraFili as PredictionRecord,
];

/**
 * IMPORTANT: distinguishing locked calls from historical backtest reconstructions.
 *
 * - A "locked call" is a real pre-fight prediction that was committed before
 *   the fight happened. predictionMadeAt is a real ISO timestamp and
 *   isBacktestReconstruction is missing/false.
 * - A "historical backtest" reconstruction is a retroactive model run on a
 *   completed fight using as-of data. isBacktestReconstruction is true.
 *
 * Model Record (public) should ONLY surface locked calls. Backtest rows are
 * shown separately, clearly labeled as historical backtest, so the product
 * never claims it called a fight it didn't actually call before the bell.
 */

function isLockedCall(record: PredictionRecord): boolean {
  return !record.isBacktestReconstruction;
}

function isHistoricalBacktest(record: PredictionRecord): boolean {
  return Boolean(record.isBacktestReconstruction);
}

/** All records (locked + historical backtest). Avoid using for public metrics. */
export function getAllPredictions(): PredictionRecord[] {
  return allRecords;
}

/** Locked pre-fight calls only — the public Model Record. */
export function getLockedPredictions(): PredictionRecord[] {
  return allRecords.filter(isLockedCall);
}

/** Historical backtest reconstructions — show separately, labeled clearly. */
export function getHistoricalBacktestReconstructions(): PredictionRecord[] {
  return allRecords.filter(isHistoricalBacktest);
}

/**
 * Public accuracy metrics. Computed from LOCKED calls only — never mixes
 * in historical backtest reconstructions, since those were never publicly
 * logged before the fights happened.
 */
export function getAccuracyMetrics(): AccuracyMetrics {
  return computeAccuracyMetrics(getLockedPredictions());
}

export function getPredictionByFightId(fightId: string): PredictionRecord | null {
  return allRecords.find((r) => r.fightId === fightId) ?? null;
}
