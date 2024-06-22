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
 *   FdsFile,
 *   Resolution,
 *   summarise_input,
 *   verifyInput,
 * } from "@smoke-cloud/fds-inspect-core";
 *
 * verifyInput(fdsData)
 * ```
 */

import {
  co_yield_test,
  devicesTest,
  flowCoverage,
  flowTemp,
  formula_tests,
  growth_rate_test,
  maximum_visibility,
  meshes_overlap_test,
  nframes_test,
  soot_yield_test,
  spkDetCeilingTest,
  visibility_factor,
} from "./checks.ts";
import type { FdsFile } from "./fds.ts";
export * as fds from "./fds.ts";
export type { FdsFile, Resolution } from "./fds.ts";
export type { InputSummary } from "./summary.ts";

export interface Test {
  id: string;
  func: (fds_data: FdsFile) => VerificationResult[];
}

export interface VerificationResult {
  type: "success" | "warning" | "failure";
  message: string;
}

export type VerificationOutcome = { id: string } & VerificationResult;

// "relatedInformation": [
// 		{
// 			"startLineNumber": 2211,
// 			"startColumn": 9,
// 			"endLineNumber": 2211,
// 			"endColumn": 19,
// 			"message": "if this is intentional, prefix it with an underscore: `_account_id`",
// 			"resource": "/c:/Users/josha/Documents/smoke-cloud-server/lib/src/lib/local_db.rs"
// 		}
// 	],

/** Given information from an FDS file, run a set of tests.
 * @param fds_data The JSON object obtained from FDS
 * @returns A summary of test results
 */
export function verifyInput(fds_data: FdsFile): VerificationOutcome[] {
  const tests: Test[] = [
    meshes_overlap_test,
    // burners_test(fds_data),
    // outputDataCoverage(fds_data),
    flowCoverage,
    // leakage(fds_data),
    devicesTest,
    spkDetCeilingTest,
    flowTemp,
    visibility_factor,
    formula_tests,
    maximum_visibility,
    nframes_test,
    soot_yield_test,
    co_yield_test,
    growth_rate_test,
  ];
  const value: VerificationOutcome[] = tests.flatMap((
    test,
  ) => (test.func(fds_data).map((res) => ({ id: test.id, ...res }))));
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

// function dt_restart_test(fds_data: FdsFile): VerificationResult {
//   let name = "Restart Interval";
//   if (fds_data.dump.dt_restart) {
//     return [name, {
//       type: "Success",
//       message: "Restart Interval is {ri}, any value is not set",
//     }];
//   } else {
//     return [name, {
//       type: "success",
//       message: "Restart Interval is not set",
//     }];
//   }
// }

// /// Test all burners.
// function burners_test(fds_data:FdsFile):  VerificationResult {
//     let name = "Burner Tests";
//     let burners = fds_data.burners();
//     if (burners.is_empty()) {
//       return   [name, {type:"failure",message:"No burners"}]
//     } else {
//         let burner_test_results = burners
//             .enumerate()
//             .map((i, burner)=> burner_test(fds_data, burner, i))
//             ;

//             return [name, burner_test_results];
//     }
// }

// /// Test a burner
// function burner_test(fds_data:FdsFile, burner:Burner, i: number):  VerificationResult {
//     let source_froude = source_froude_test(burner);
//     // let ndr = ndr_test(fds_data, burner);
//     let growth_rate = growth_rate_test(fds_data, burner);
//     // let intersection = intersection_test(fds_data, burner);

//        return  [
//             `Burner Test #{i} (burner.name.unwrap_or("Unnamed"){})`
//           ,
//         [
//             source_froude,
//             // ndr,
//             growth_rate,
//             // intersection
//         ]] ;
// }

// function source_froude_test(burner:Burner):  VerificationResult {
//     let name = "Source Froude";
//     let max_threshold = 2.5;
//     let source_froude = burner.source_froude();
//     if (source_froude <= max_threshold) {
//         [name, testResult("Success",format!("{}", source_froude))]
//     } else {
//        [name, testResult("Failure",format!("{}", source_froude))]
//     }
// }

// function ndr_test(fds_data:FdsFile, burner:Burner):  VerificationResult {
//     let name = "Non-Dimensionalised Ratio";
//     let ndrs = burner.ndr();
//     if (ndrs.len() === 1) {
//         verificationResult(name, ndr_res(ndrs[0]))
//     } else {
//         let ndr_test_results = ndrs.map(ndr_res).enumerate();
//         let res = [];
//         for ((i, ndr_t) of ndr_test_results) {
//             res.push(verificationResult(format!("Panel {}", i), ndr_t));
//         }
//         verificationTree(name, res)
//     }
// }

// function ndr_res(ndr: number):  TestResult {
//     if (ndr <= 4) {
//         testResult("Success",format!("{}", ndr))
//     } else {
//         testResult("Failure",format!("{}", ndr))
//     }
// }

// function intersection_test(fds_data:FdsFile, burner:Burner):  VerificationResult {
//     todo!()
// }

// //     /// Test that the burner does not intersect with any other obstructions.
// //     intersectionTest :: Burner -> FdsFile -> Tree CompletedTest
// //     intersectionTest burner fdsData = case getBurnerId burner of
// //         // TODO: we should be able to uniquely identify each OBST
// //         Nothing -> Node (CompletedTest testName $ Failure
// //             $ "Cannot test burner intersection as burner does not have a name.")
// //             []
// //         Just burnerId ->
// //             let
// //                 isBurner nml = case getId nml of
// //                     Nothing -> False
// //                     Just x -> x === burnerId
// //                 intersectsWith = filter (not . isBurner)
// //                     $ obstIntersectsWithOthers fdsData burner
// //             in if null intersectsWith
// //                 then Node (CompletedTest testName $ Success
// //                     $ "Burner does not intersect with other obstructions.") []
// //                 else Node (CompletedTest testName $ Failure
// //                     $ "Burner intersects wth the following obstructions: \n"
// //                         ++ unlines (map (\nml-> indent $ (fromMaybe "(unknown)"
// //                         $ getId nml)
// //                         {- ++ " at " ++ showSourcePose nml -}) intersectsWith))
// //                         []
// //         where
// //             testName = "Intersection"

// // showSourcePose nml = "Line " <> show (sourceLine pos) <> ", Column "
// //     <> show (sourceColumn pos) <> " of input file"
// //     where pos = nml_location nml

// // indent string = "--" ++ string
// // sprinklerTestsGroup :: NamelistFile -> Tree CompletedTest
// // sprinklerTestsGroup = \fdsData ->
// //   let
// //     testName = "Sprinklers"
// //     sprinklers = getSprinklerDevcs fdsData
// //     completedTests = map (sprinklerTestsIndividual fdsData) sprinklers
// //   in case completedTests of
// //     [] -> Node (CompletedTest testName (Warning "No burners present.")) completedTests
// //     _  -> Node (CompletedTest testName (worstN completedTests)) completedTests

// ///Tests to apply to the various burners found in a model.
// function sprinkler_test() {
//     unimplemented!()
//     // sprinklerTestsIndividual :: NamelistFile -> Namelist -> Tree CompletedTest
//     // sprinklerTestsIndividual fdsData sprinkler =
//     //   let
//     //       testName = "Sprinklers Tests for " ++ sprinklerName
//     //       tests = pam tests' sprinkler
//     //       testResults = pam tests fdsData
//     //       summaryResults = worstN testResults
//     //   in Node (CompletedTest testName summaryResults) testResults
//     //   where
//     //     tests' :: [(Namelist -> NamelistFile -> Tree CompletedTest)]
//     //     tests' =
//     //       [ temperatureTest
//     //       ]
//     //     sprinklerName = getIDBound sprinkler
// }

// function outputDataCoverage(fds_data:FdsFile): VerificationResult {
//     let name = "Output Data Coverage";
//     let tests  =  [tempDataCoverage, visDataCoverage];
//     let test_results = [];
//     for (test_result of tests.map((test) => test(fds_data))) {
//         test_results.push(test_result);
//     }
//     return  verificationTree(name, test_results)
// }

// function dataCoverage(fds_data:FdsFile, value:str, f:  (Slcf)=> boolean): VerificationResult {
//     let name = `{value} Data Coverage`;
//     // Get all the slices relevant to this output type.
//     let slices: Slcf[] = fds_data.slcf.filter(f);
//     let tests =
//         [xAxisCoverage, yAxisCoverage, zAxisCoverage];
//     let test_results =  [];
//     for (test_result of tests.map((test) => test(slices))) {
//         test_results.push(test_result);
//     }
//   return   verificationTree(name, test_results)
// }

// /// Carbon monoxide data coverage test.
// function coDataCoverage(fds_data:FdsFile): VerificationResult {
//     let f =  (slice:Slcf)=>
//         slice.spec_id === Some("CARBON MONOXIDE")
//             && slice.quantity === Some("VOLUME FRACTION")
//     ;
//  return   dataCoverage(fds_data, "CO", f)
// }

// /// Tempearature data coverage test.
// function tempDataCoverage(fds_data:FdsFile): VerificationResult {
//     let f =  (slice:Slcf)=> slice.quantity === "TEMPERATURE";
//     return  dataCoverage(fds_data, "Temperature", f)
// }

// /// Soot Visibility data coverage test.
// function visDataCoverage(fds_data:FdsFile): VerificationResult {
//     let f = (slice:Slcf)=> slice.quantity === "VISIBILITY";
//     return  dataCoverage(fds_data, "Visibility", f)
// }

// /// X-Axis coverage test
// function xAxisCoverage(slices:[Slcf]): VerificationResult {
//     return  axisCoverage(slices, "X", (s) => s.pbx.is_some())
// }

// /// Y-Axis coverage test
// function yAxisCoverage(slices:[Slcf]): VerificationResult {
//     return axisCoverage(slices, "Y", (s) => s.pby.is_some())
// }

// /// Z-Axis coverage test
// function zAxisCoverage(slices:[Slcf]): VerificationResult {
//     return  axisCoverage(slices, "Z", (s) => s.pbz.is_some())
// }

// function axisCoverage(slices:[Slcf], axis:str, f: (Slcf)=> boolean): VerificationResult {
//     let name = `{axis} Axis Coverage`;
//     // TODO: check that the value for PB* is within the bounds of the model
//     if (slices.any(f)) {
//         return verificationResult(
//             name,
//             testResult("Success",`Full {axis} axis coverage of this value is present.`),
//         )
//     } else {
//         return  verificationResult(
//             name,
//             testResult("Failure",`Full {axis} axis coverage of this value is not present.`),
//         )
//     }
// }

// impl Resolution {
//     pub fn volume_rat(&self) -> Rational64 {
//         self.x * self.y * self.z
//     }
//     pub fn volume(&self) -> number {
//         self.volume_rat().to_number().unwrap()
//     }
//     pub fn max_side(&self) -> number {
//         let mut max = self.x;
//         if self.y > max {
//             max = self.y;
//         }
//         if self.z > max {
//             max = self.z;
//         }
//         max.to_number().unwrap()
//     }
// }
