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
 * verifyInput(stdTestList, fdsData)
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
  nonInertMaterialsTest,
  hrrRealised,
  matchingChids,
  maximumVisibilityTest,
  meshesOverlapTest,
  nFramesTest,
  sootYieldTest,
  spkDetCeilingTest,
  visibilityFactorTest,
} from "./checks.ts";
import type { FdsData } from "./fds.ts";
import type { SmvData } from "./smv.ts";
export * as fds from "./fds.ts";
export * as smv from "./smv.ts";
export * as summary from "./summary.ts";
export type { FdsData, FdsFile, Resolution } from "./fds.ts";
export type { SmvData } from "./smv.ts";
export type { InputSummary } from "./summary.ts";

export type Test = InputTest | OutputTest | InputOutputTest;

export interface InputTest {
  id: string;
  stages: "in";
  func: (fdsData: FdsData) => Promise<VerificationResult[]>;
}

export interface OutputTest {
  id: string;
  stages: "out";
  func: (smvData: SmvData) => Promise<VerificationResult[]>;
}

export interface InputOutputTest {
  id: string;
  stages: "inout";
  func: (fdsData: FdsData, smvData: SmvData) => Promise<VerificationResult[]>;
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
  nonInertMaterialsTest,
  burnerExistenceTest,
  matchingChids,
  hrrRealised,
];

/** Given information from an FDS file, run a set of tests.
 * @param fdsData The JSON object obtained from FDS
 * @returns A summary of test results
 */
export async function verifyInput(
  testList: Test[],
  fdsData: FdsData,
  smvData?: SmvData,
): Promise<VerificationOutcome[]> {
  const outcomes: VerificationOutcome[] = [];
  for (const test of testList) {
    switch (test.stages) {
      case "in":
        {
          const results = await test.func(fdsData);
          for (const result of results) {
            outcomes.push({
              id: test.id,
              ...result,
            });
          }
        }
        break;
      case "out":
        {
          if (!smvData) continue;
          const results = await test.func(smvData);
          for (const result of results) {
            outcomes.push({
              id: test.id,
              ...result,
            });
          }
        }
        break;
      case "inout":
        {
          if (!smvData) continue;
          const results = await test.func(fdsData, smvData);
          for (const result of results) {
            outcomes.push({
              id: test.id,
              ...result,
            });
          }
        }
        break;
    }
  }
  return outcomes;
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
