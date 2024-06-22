/**
 * This module contains functions to inspect, test, and summarise FDS input
 * information
 * @module
 *
 *  * @example
 * ```ts
 * import {
 *   clearSuccessSummary,
 *   countCells,
 *   FdsData,
 *   Resolution,
 *   summarise_input,
 *   verifyInput,
 *   stdTestList,
 * } from "@smoke-cloud/fds-inspect-core";
 *
 * verifyInput(fdsData, stdTestList)
 * ```
 */

import {
  burnerExistenceTest,
  coYieldTest,
  deviceInSolidTest,
  flowCoverageTest,
  flowTempTest,
  formulaTest,
  growthRateTest,
  maximumVisibilityTest,
  meshesOverlapTest,
  nFramesTest,
  sootYieldTest,
  spkDetCeilingTest,
  visibilityFactorTest,
} from "./checks.ts";
import type { FdsData } from "./fds.ts";
export * as fds from "./fds.ts";
export * as summary from "./summary.ts";
export type { FdsData, FdsFile, Resolution } from "./fds.ts";
export type { InputSummary } from "./summary.ts";

export interface Test {
  id: string;
  func: (fdsData: FdsData) => VerificationResult[];
}

export interface VerificationResult {
  type: "success" | "warning" | "failure";
  message: string;
}

export type VerificationOutcome = { id: string } & VerificationResult;

export const stdTestList: Test[] = [
  meshesOverlapTest,
  flowTempTest,
  sootYieldTest,
  coYieldTest,
  formulaTest,
  visibilityFactorTest,
  maximumVisibilityTest,
  nFramesTest,
  flowCoverageTest,
  deviceInSolidTest,
  spkDetCeilingTest,
  growthRateTest,
  burnerExistenceTest,
];

/** Given information from an FDS file, run a set of tests.
 * @param fdsData The JSON object obtained from FDS
 * @returns A summary of test results
 */
export function verifyInput(
  fdsData: FdsData,
  testList: Test[],
): VerificationOutcome[] {
  const value: VerificationOutcome[] = testList.flatMap((
    test,
  ) => (test.func(fdsData).map((res) => ({ id: test.id, ...res }))));
  return value;
}

/** Create a new {@link VerificationSummary} without tests that have passed with
 * success.
 * @param summary Test results
 * @returns Test results with successes removed
 */
export function clearSuccessSummary(
  summary: VerificationOutcome[],
): VerificationOutcome[] {
  return summary.filter((res) => res.type !== "success");
}
