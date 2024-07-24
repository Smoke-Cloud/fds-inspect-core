// deno-lint-ignore-file require-await
import {
  type Devc,
  type FdsData,
  findMatchingGrowthRate,
  generateHrrRelDiff,
  intersect,
  type IVent,
  type Reac,
  type Vent,
} from "./fds.ts";
import {
  fds,
  type SmvData,
  type Test,
  type VerificationResult,
} from "./mod.ts";

function success(
  message: string,
): VerificationResult {
  return { type: "success", message };
}

function warning(
  message: string,
): VerificationResult {
  return { type: "warning", message };
}

function failure(
  message: string,
): VerificationResult {
  return { type: "failure", message };
}

/// Do any of the meshes overlap.
export const meshesOverlapTest: Test = {
  id: "input.meshes.overlap",
  stages: "in",
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    // Clone a list of meshes.
    const intersections = [];
    // console.log(fdsData.meshes.map(mesh=>mesh.dimensions))
    for (const meshA of fdsData.meshes) {
      for (const meshB of fdsData.meshes) {
        if (meshA.index === meshB.index) continue;
        if (intersect(meshA.dimensions, meshB.dimensions)) {
          console.log(
            `intersection of '${meshA.id}' and '${meshB.id}'`,
            meshA.dimensions,
            meshB.dimensions,
          );
          console.log("x1", meshA.dimensions.x1, meshB.dimensions.x1);
          console.log("x2", meshA.dimensions.x2, meshB.dimensions.x2);
          console.log("y1", meshA.dimensions.y1, meshB.dimensions.y1);
          console.log("y2", meshA.dimensions.y2, meshB.dimensions.y2);
          console.log("z1", meshA.dimensions.z1, meshB.dimensions.z1);
          console.log("z2", meshA.dimensions.z2, meshB.dimensions.z2);
          intersections.push([meshA, meshB]);
        }
      }
    }
    if (intersections.length === 0) {
      return [
        success("No Intersections"),
      ];
    } else {
      const res = [];
      for (const [meshA, meshB] of intersections) {
        res.push(
          failure(
            `Mesh \`${meshA.id}\` intersects with \`${meshB.id}\``,
          ),
        );
      }
      return res;
    }
  },
};

export const flowTempTest: Test = {
  id: "input.flows.parameters.temperature",
  stages: "in",
  // Supplies should not have a temperature specified
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    const testResults = [];
    // List of surfaces that should have an ambient temperature.
    const flowSurfaces: Set<string> = new Set();
    for (const mesh of fdsData.meshes) {
      for (const vent of mesh.vents ?? []) {
        if (!vent.surface) continue;
        // const surface = vent.surface
        //     ? fdsData.getSurface(vent.surface)
        //     : undefined;
        flowSurfaces.add(vent.surface);
      }
    }
    for (const surfaceId of flowSurfaces) {
      const surface = fdsData.getSurface(surfaceId);
      if (!surface) continue;
      if (!surface.hasFlow) continue;
      if (surface.tmp_front == undefined) {
        testResults.push(success(
          `Flow Temp for Surface \`${surface.id}\` leaves TMP_FRONT as default`,
        ));
      } else if (surface.tmp_front == 293.15) {
        testResults.push(success(
          `Flow Temp for Surface \`${surface.id}\` leaves TMP_FRONT as default`,
        ));
      } else {
        testResults.push(failure(
          `Flow Temp for Surface \`${surface.id}\` sets TMP_FRONT to \`${surface.tmp_front}\`, which is not an expected value`,
        ));
      }
    }
    return testResults;
  },
};

export const sootYieldTest: Test = {
  id: "input.reac.sootYield",
  stages: "in",
  func: async function (
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    const results = [];
    for (const reac of fdsData.reacs ?? []) {
      const propName = "Soot Yield";
      const value = reac.soot_yield;
      const possibleValues = new Set([0.07, 0.1]);
      if (value) {
        if (possibleValues.has(value)) {
          results.push(
            success(
              `${propName} was ${value}, a recognised value.`,
            ),
          );
        } else {
          results.push(
            failure(
              `${propName} was ${value}, which is not one of the usual values of {possibleValues:?}.`,
            ),
          );
        }
      } else {
        results.push(
          failure(`${propName} was not specified.`),
        );
      }
    }
    return results;
  },
};

export const coYieldTest: Test = {
  id: "input.reac.coYield",
  stages: "in",
  func: async function (
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    const results = [];
    for (const reac of fdsData.reacs ?? []) {
      const propName = "CO Yield";
      const possibleValues = new Set([0.05, 0.014]);
      const value = reac.co_yield;
      if (value) {
        if (possibleValues.has(value)) {
          results.push(
            success(
              `${propName} was ${value}, a recognised value.`,
            ),
          );
        } else {
          results.push(
            failure(
              `${propName} was ${value}, which is not one of the usual values of {possibleValues:?}.`,
            ),
          );
        }
      } else {
        results.push(
          failure("{propName} was not specified."),
        );
      }
    }
    return results;
  },
};

export const formulaTest: Test = {
  id: "input.reac.formula",
  stages: "in",
  func: async function formula_tests(
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    function mkTestProp(
      name: string,
      f: (reac: Reac) => number,
      possibleValues: Set<number>,
    ) {
      return (fdsData: FdsData, reac: Reac) =>
        testProp(name, f, possibleValues, fdsData, reac);
    }
    function testProp(
      name: string,
      f: (reac: Reac) => number,
      possibleValues: Set<number>,
      _fdsData: FdsData,
      reac: Reac,
    ): VerificationResult {
      const propName = name;
      const value = f(reac);
      if (value) {
        if (possibleValues.has(value)) {
          return success(
            `${propName} was ${value}, a recognised value.`,
          );
        } else {
          return failure(
            `${propName} was ${value}, which is not one of the usual values of ${
              Array.from(possibleValues.values()).join(
                ",",
              )
            }.`,
          );
        }
      } else {
        return failure(`${propName} was not specified.`);
      }
    }
    const tests = [
      mkTestProp("c", (reac: Reac) => reac.c, new Set([1])),
      mkTestProp("h", (reac: Reac) => reac.h, new Set([1.45])),
      mkTestProp("n", (reac: Reac) => reac.n, new Set([0.04])),
      mkTestProp("o", (reac: Reac) => reac.o, new Set([0.46])),
    ];
    const test_results = [];
    if (!fdsData.reacs[0]) {
      test_results.push(
        failure("No REAC has been specified"),
      );
    } else if (fdsData.reacs.length > 1) {
      test_results.push(
        failure("No REAC has been specified"),
      );
    } else {
      for (
        const test_result of tests.map((test) =>
          test(fdsData, fdsData.reacs[0])
        )
      ) {
        test_results.push(test_result);
      }
    }
    return test_results;
  },
};

export const visibilityFactorTest: Test = {
  id: "input.reac.visibilityFactor",
  stages: "in",
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    const vis = fdsData.visibility_factor;
    let visibility_factor;
    if (!vis) {
      return [
        failure("Visibility Factor Not Set"),
      ];
    } else {
      visibility_factor = vis;
    }

    if (visibility_factor === 3.0 || visibility_factor === 8.0) {
      return [
        success(
          `Visibility Factor is ${visibility_factor}, a known value.`,
        ),
      ];
    } else {
      return [
        failure(
          `Visibility Factor is {visibility_factor}. Known good visibility factors are 3 and 8.`,
        ),
      ];
    }
  },
};

export const maximumVisibilityTest: Test = {
  id: "input.reac.maximumVisibility",
  stages: "in",
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    const vis = fdsData.ec_ll && fdsData.visibility_factor
      ? fdsData.visibility_factor / fdsData.ec_ll
      : undefined;
    let maximum_visibility;
    if (!vis) {
      return [
        failure("Maximum Visibility Not Set"),
      ];
    } else {
      maximum_visibility = vis;
    }

    if (maximum_visibility >= 100.0) {
      return [
        success(
          `Maximum Visibility is ${maximum_visibility} m, at least 100 m.`,
        ),
      ];
    } else {
      return [
        failure(
          `Maximum Visibility is ${maximum_visibility}. This is a low value and may cause issues when try to visualise results.`,
        ),
      ];
    }
  },
};

export const nFramesTest: Test = {
  id: "input.dump.nFrames",
  stages: "in",
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    function getSimTimes(fdsData: FdsData): [number, number] {
      if (fdsData.time) {
        return [fdsData.time.begin ?? 0, fdsData.time.end ?? 0];
      } else {
        return [0.0, 1.0];
      }
    }
    if (fdsData.dump.nframes) {
      const [tStart, tEnd] = getSimTimes(fdsData);
      const simInterval = Math.round(tEnd - tStart);
      const s = simInterval % fdsData.dump.nframes;
      if (s === 0) {
        return [
          success(
            `Value ${fdsData.dump.nframes}, results in round number of frames`,
          ),
        ];
      } else {
        return [
          failure(
            `Value ${fdsData.dump.nframes} may result in clipped output`,
          ),
        ];
      }
    } else {
      return [
        failure("NFRAMES not specified"),
      ];
    }
  },
};

export const flowCoverageTest: Test = {
  id: "input.measure.flow",
  stages: "in",
  /// Ensure that everage flow device is covered by a flow rate device. TODO: does not cover HVAC.
  func: async function flowCoverage(
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    // it is also possible that other objects (such as OBST have flow)
    // TODO: obsts
    // const obsts = getObsts(fdsData);
    // vents which may have a flow
    const ventsWithFlows: Vent[] = fdsData.supplies.concat(
      fdsData.extracts,
    );
    // obsts that have surfaces with flows
    // const obstWithFlows: any[] = obsts.filter((obst) =>
    //   obstHasFlow(fdsData, obst)
    // );
    // for each of the vents, ensure there is a flow device with the same
    // dimensions find those which do not
    const notCovered: IVent[] = ventsWithFlows
      .filter((vent) => !fdsData.hasFlowDevc(vent));
    if (notCovered.length === 0) {
      return [
        success("All Flows Vents and Obsts Measured"),
      ];
    } else {
      const issues: VerificationResult[] = notCovered
        .map((vent) =>
          failure(
            `Vent \`${vent.id}\` has no adequate volume flow measuring device`,
          )
        );
      return issues;
    }
  },
};

export const deviceInSolidTest: Test = {
  id: "input.measure.device.inSolid",
  stages: "in",
  /// Ensure that no devices are stuck in solids.
  func: async function devicesTest(
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    const stuckDevices: Devc[] = fdsData
      .devices
      // ND: we only perform this check for devices with a prop id (which is
      // usually detectors and the like)
      .filter((devc) => devc.stuckInSolid && devc.prop_id);
    if (stuckDevices.length === 0) {
      return [success("No stuck devices")];
    } else {
      const issues: VerificationResult[] = stuckDevices
        .map((devc) =>
          failure(
            `Devc ${devc.id} Positioned within solid obstruction`,
          )
        );
      return issues;
    }
  },
};

export const spkDetCeilingTest: Test = {
  id: "input.measure.device.underCeiling",
  stages: "in",
  /// Ensure that sprinklers and smoke detectors are beneath a ceiling.
  func: async function (fdsData: FdsData): Promise<VerificationResult[]> {
    const nonBeneathCeiling: Devc[] = fdsData
      .devices
      .filter((devc) =>
        devc.isSprinkler ||
        devc.isSmokeDetector ||
        devc.isThermalDetector
      )
      .filter((devc) => !devc.devcBeneathCeiling);
    if (nonBeneathCeiling.length === 0) {
      return [
        success(
          "All sprinklers and detectors are immediately below the ceiling",
        ),
      ];
    } else {
      const issues: VerificationResult[] = nonBeneathCeiling
        .map((devc) =>
          failure(
            `Devc \`${devc.id}\` is not immediately beneath solid obstruction`,
          )
        );
      return issues;
    }
  },
};

/// Test the growth rate of a burner and check that it either matches a standard
/// growth rate, or a steady-state value within 30 s.
export const growthRateTest: Test = {
  id: "input.burner.growthRate",
  stages: "in",
  func: async function (
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    const hrrSpec = fdsData.hrrSpec;
    if (!hrrSpec) return [];
    if (hrrSpec.type === "composite") {
      return [failure(
        `Growth rate is composite`,
      )];
    }
    const results: VerificationResult[] = [];
    const matchingGrowthRate = findMatchingGrowthRate(hrrSpec);
    const info =
      `TAU_Q = ${hrrSpec.tau_q} s, (${matchingGrowthRate}), MaxHRR = ${
        hrrSpec.peak / 1000
      } kW`;
    if (hrrSpec.tau_q == undefined) {
      results.push(
        warning(
          "No growth rate specified. If steady-state is intended a ramp-up of 30 s should be used.",
        ),
      );
    } else if (hrrSpec.tau_q === -30) {
      // TODO: add floating point bounds
      results.push(
        success(`Growth rate is 30 s (as used for steady-state)`),
      );
    } else if (matchingGrowthRate) {
      results.push(
        success(
          `Alpha matches standard value: ${info}`,
        ),
      );
    } else {
      results.push(
        failure(
          `Alpha value deviates from standard values: ${info}`,
        ),
      );
    }
    return results;
  },
};

export const burnerExistenceTest: Test = {
  id: "input.burner.exists",
  stages: "in",
  func: async function (
    fdsData: FdsData,
  ): Promise<VerificationResult[]> {
    const n_burners = fdsData.burners.length;
    if (n_burners > 0) {
      return [success(`${n_burners} burners were found`)];
    } else {
      return [failure("No burners")];
    }
  },
};

export const matchingChids: Test = {
  id: "matching.chid",
  stages: "inout",
  func: async function (
    fdsData: FdsData,
    smvData: SmvData,
  ): Promise<VerificationResult[]> {
    if (fdsData.chid === smvData.chid) {
      return [success(`CHIDs match, ${fdsData.chid} = ${smvData.chid}`)];
    } else {
      return [
        failure(`CHIDs don't match, ${fdsData.chid} ≠ ${smvData.chid}`),
      ];
    }
  },
};

export const hrrRealised: Test = {
  id: "matching.hrr",
  stages: "inout",
  func: async function (
    fdsData: FdsData,
    smvData: SmvData,
  ): Promise<VerificationResult[]> {
    const hrrSpec = fdsData.hrrSpec;
    if (!hrrSpec || hrrSpec.type === "composite") return [];
    const base = await smvData.getHrr();
    if (!base) return [];
    const diffVec = generateHrrRelDiff(hrrSpec, base);
    // Ignoring the first 60 s, see if HRR exceeds a 10% bound on target. If
    // it does, issue warning, if it does for longer than 10 s issue
    // failure.
    let occurs = false;
    let start = undefined;
    let maxPeriod = 0;
    let totalTime = 0;
    for (const p of diffVec.values) {
      // ignore the first 60 s
      if (p.x <= 60) continue;
      if (Math.abs(p.y) > 0.1) {
        occurs = true;
        if (start == undefined) {
          start = p.x;
        }
      } else {
        if (start != undefined) {
          const period = p.x - start;
          start = undefined;
          maxPeriod = Math.max(period, maxPeriod);

          totalTime += period;
        }
      }
    }
    if (maxPeriod >= 10) {
      return [
        failure(
          `HRR exceeds 10% bounds for greater than 10 s (${
            totalTime.toFixed(2)
          } s in total for a maximum of ${maxPeriod.toFixed(2)})`,
        ),
      ];
    } else if (occurs) {
      return [
        warning(`HRR exceeds 10% bounds, albeit only momentarily`),
      ];
    } else {
      return [success(`HRR matches specification within 10% bounds`)];
    }
  },
};
