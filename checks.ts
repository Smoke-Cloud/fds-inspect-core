import {
    alpha,
    type Devc,
    type FdsData,
    intersect,
    type IVent,
    type Reac,
    StdGrowthRate,
} from "./fds.ts";
import type { Test, VerificationResult } from "./mod.ts";

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
    func: function (fdsData: FdsData): VerificationResult[] {
        // Clone a list of meshes.
        const intersections = [];
        for (const meshA of fdsData.meshes) {
            for (const meshB of fdsData.meshes) {
                if (meshA.index === meshB.index) continue;
                if (intersect(meshA.dimensions, meshB.dimensions)) {
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
    // Supplies should not have a temperature specified
    func: function (fdsData: FdsData): VerificationResult[] {
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
    func: function (
        fdsData: FdsData,
    ): VerificationResult[] {
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
    func: function (
        fdsData: FdsData,
    ): VerificationResult[] {
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
    func: function formula_tests(fdsData: FdsData): VerificationResult[] {
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
    func: function (fdsData: FdsData): VerificationResult[] {
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
    func: function (fdsData: FdsData): VerificationResult[] {
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
    func: function (fdsData: FdsData): VerificationResult[] {
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
    /// Ensure that everage flow device is covered by a flow rate device. TODO: does not cover HVAC.
    func: function flowCoverage(fdsData: FdsData): VerificationResult[] {
        // it is also possible that other objects (such as OBST have flow)
        const vents = fdsData.meshes.flatMap((mesh) => mesh.vents ?? []);
        // TODO: obsts
        // const obsts = getObsts(fdsData);
        // vents which may have a flow
        const ventsWithFlows: IVent[] = vents.filter((vent) =>
            fdsData.ventHasFlow(vent)
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
    /// Ensure that no devices are stuck in solids.
    func: function devicesTest(fdsData: FdsData): VerificationResult[] {
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
    /// Ensure that sprinklers and smoke detectors are beneath a ceiling.
    func: function (fdsData: FdsData): VerificationResult[] {
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
/// growth rate, or a steady-state value within 20 s.
export const growthRateTest: Test = {
    id: "input.burner.growthRate",
    func: function (
        fdsData: FdsData,
    ): VerificationResult[] {
        const results: VerificationResult[] = [];
        for (const burner of fdsData.burners) {
            // TODO: This requires understanding the burner and it's exposed surfaces
            // TODO: allow steady state curves
            const surface = burner.surface;
            if (!surface) return [];
            const tau_q = surface?.tau_q;

            // if (!tau_qs.all((x) => x === tau_q)) {
            //   // If all TAU_Qs are no the same, test fails
            //   results.push({
            //     type: "failure",
            //     message: "Multiple different TAU_Q values",
            //   });
            // }
            const specifiedAlpha = burner.maxHrr / Math.abs(tau_q) ** 2;

            const std_growth_rates = [
                StdGrowthRate.NFPASlow,
                StdGrowthRate.NFPAFast,
                StdGrowthRate.NFPAMedium,
                StdGrowthRate.NFPAUltrafast,
                StdGrowthRate.EurocodeSlow,
                StdGrowthRate.EurocodeMedium,
                StdGrowthRate.EurocodeFast,
                StdGrowthRate.EurocodeUltrafast,
            ];

            const std_growth_diffs: [StdGrowthRate, number][] = std_growth_rates
                .map((
                    std_alpha,
                ) => [
                    std_alpha,
                    Math.abs(
                        (specifiedAlpha - alpha(std_alpha)) /
                            alpha(std_alpha),
                    ),
                ]);
            let min_diff = std_growth_diffs[0][1];
            let matchingGrowthRate: StdGrowthRate | undefined;
            // console.log(std_growth_diffs);
            for (const [growthRate, growth_diff] of std_growth_diffs) {
                if (growth_diff < min_diff) {
                    min_diff = growth_diff;
                    matchingGrowthRate = growthRate;
                }
            }
            if (tau_q == undefined) {
                results.push(
                    warning(
                        "No growth rate specified. If steady-state is intended a ramp-up of 30 s should be used.",
                    ),
                );
            } else if (tau_q < -30) {
                results.push(
                    success(`Growth rate is 30 s (as used for steady-state)`),
                );
            } else if (min_diff < 0.001) {
                results.push(
                    success(
                        `Alpha matches standard value, tau_q: ${tau_q} s, α: ${specifiedAlpha} (${matchingGrowthRate}), maxHRR: ${burner.maxHrr} kW`,
                    ),
                );
            } else {
                results.push(
                    failure(
                        `Alpha value deviates from standard values, tau_q: ${tau_q} s, α: ${specifiedAlpha} (${matchingGrowthRate}), maxHRR: ${burner.maxHrr} kW`,
                    ),
                );
            }
        }
        return results;
    },
};

export const burnerExistenceTest: Test = {
    id: "input.burner.exists",
    func: function (
        fdsData: FdsData,
    ): VerificationResult[] {
        const n_burners = fdsData.burners.length;
        if (n_burners > 0) {
            return [success(`${n_burners} burners were found`)];
        } else {
            return [failure("No burners")];
        }
    },
};
