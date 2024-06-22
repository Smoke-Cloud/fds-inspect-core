import {
    alpha,
    type Devc,
    devcBeneathCeiling,
    devcIsSmokeDetector,
    devcIsSprinkler,
    devcIsThermalDetector,
    type FdsFile,
    get_burners,
    getBurnerSurf,
    getSurface,
    hasFlowDevc,
    intersect,
    max_hrr,
    type Reac,
    StdGrowthRate,
    stuckInSolid,
    type Vent,
    ventHasFlow,
} from "./fds.ts";
import type { Test, VerificationResult } from "./mod.ts";

function verificationResult(
    type: "success" | "warning" | "failure",
    b: string,
): VerificationResult {
    return { type, message: b };
}

/// Do any of the meshes overlap.
export const meshes_overlap_test: Test = {
    id: "input.meshes.overlap",
    func: function (fds_data: FdsFile): VerificationResult[] {
        // Clone a list of meshes.
        const intersections = [];
        for (const meshA of fds_data.meshes) {
            for (const meshB of fds_data.meshes) {
                if (meshA.index === meshB.index) continue;
                if (intersect(meshA.dimensions, meshB.dimensions)) {
                    intersections.push([meshA, meshB]);
                }
            }
        }
        if (intersections.length === 0) {
            return [
                verificationResult(
                    "success",
                    "No Intersections",
                ),
            ];
        } else {
            const res = [];
            for (const [meshA, meshB] of intersections) {
                res.push(verificationResult(
                    "failure",
                    `Mesh \`${meshA.id}\` intersects with \`${meshB.id}\``,
                ));
            }
            return res;
        }
    },
};

function flowTempTest(fds_data: FdsFile, vent: Vent): VerificationResult {
    if (!vent.surface) {
        return verificationResult(
            "success",
            `Flow Temp vent ([\`${vent.index}\`]: \`${vent.id}\`)`,
        );
    }
    const surface = vent.surface
        ? getSurface(fds_data, vent.surface)
        : undefined;
    if (!surface) {
        return verificationResult(
            "failure",
            `Surface (${vent.surface}) could not be found`,
        );
    }
    if (surface.tmp_front == undefined) {
        return verificationResult(
            "success",
            `Flow Temp for Surface (\`${vent.surface}\`) specified for vent ([\`${vent.index}\`]: \`${vent.id}\`)` +
                `Surface (\`${vent.surface}\`) leaves TMP_FRONT as default`,
        );
    } else if (surface.tmp_front == 293.15) {
        return verificationResult(
            "success",
            `Flow Temp for Surface (\`${vent.surface}\`) specified for vent ([\`${vent.index}\`]: \`${vent.id}\`)` +
                `Surface (\`${vent.surface}\`) leaves TMP_FRONT as default`,
        );
    } else {
        return verificationResult(
            "failure",
            `Flow Temp for Surface (\`${vent.surface}\`) specified for vent ([\`${vent.index}\`]: \`${vent.id}\`)` +
                `Surface (\`${vent.surface}\`) sets TMP_FRONT to \`${surface.tmp_front}\`, which is not an expected value`,
        );
    }
}

export const flowTemp: Test = {
    id: "input.flows.parameters.temperature",
    // Supplies should not have a temperature specified
    func: function (fds_data: FdsFile): VerificationResult[] {
        const testResults = [];
        for (const mesh of fds_data.meshes) {
            for (const vent of mesh.vents ?? []) {
                testResults.push(flowTempTest(fds_data, vent));
            }
        }
        return testResults;
    },
};

export const soot_yield_test: Test = {
    id: "input.reac.sootYield",
    func: function (
        fds_data: FdsFile,
    ): VerificationResult[] {
        const results = [];
        for (const reac of fds_data.reacs ?? []) {
            const propName = "Soot Yield";
            const value = reac.soot_yield;
            const possibleValues = new Set([0.07, 0.1]);
            if (value) {
                if (possibleValues.has(value)) {
                    results.push(
                        verificationResult(
                            "success",
                            `${propName} was ${value}, a recognised value.`,
                        ),
                    );
                } else {
                    results.push(verificationResult(
                        "failure",
                        `${propName} was ${value}, which is not one of the usual values of {possibleValues:?}.`,
                    ));
                }
            } else {
                results.push(
                    verificationResult(
                        "failure",
                        `${propName} was not specified.`,
                    ),
                );
            }
        }
        return results;
    },
};

export const co_yield_test: Test = {
    id: "input.reac.coYield",
    func: function (
        fds_data: FdsFile,
    ): VerificationResult[] {
        const results = [];
        for (const reac of fds_data.reacs ?? []) {
            const propName = "CO Yield";
            const possibleValues = new Set([0.05, 0.014]);
            const value = reac.co_yield;
            if (value) {
                if (possibleValues.has(value)) {
                    results.push(
                        verificationResult(
                            "success",
                            `${propName} was ${value}, a recognised value.`,
                        ),
                    );
                } else {
                    results.push(verificationResult(
                        "failure",
                        `${propName} was ${value}, which is not one of the usual values of {possibleValues:?}.`,
                    ));
                }
            } else {
                results.push(
                    verificationResult(
                        "failure",
                        "{propName} was not specified.",
                    ),
                );
            }
        }
        return results;
    },
};

export const formula_tests: Test = {
    id: "input.reac.formula",
    func: function formula_tests(fds_data: FdsFile): VerificationResult[] {
        function mkTestProp(
            name: string,
            f: (reac: Reac) => number,
            possibleValues: Set<number>,
        ) {
            return (fds_data: FdsFile, reac: Reac) =>
                testProp(name, f, possibleValues, fds_data, reac);
        }
        function testProp(
            name: string,
            f: (reac: Reac) => number,
            possibleValues: Set<number>,
            _fds_data: FdsFile,
            reac: Reac,
        ): VerificationResult {
            const propName = name;
            const value = f(reac);
            if (value) {
                if (possibleValues.has(value)) {
                    return verificationResult(
                        "success",
                        `${propName} was ${value}, a recognised value.`,
                    );
                } else {
                    return verificationResult(
                        "failure",
                        `${propName} was ${value}, which is not one of the usual values of ${
                            Array.from(possibleValues.values()).join(
                                ",",
                            )
                        }.`,
                    );
                }
            } else {
                return verificationResult(
                    "failure",
                    `${propName} was not specified.`,
                );
            }
        }
        const tests = [
            mkTestProp("c", (reac: Reac) => reac.c, new Set([1])),
            mkTestProp("h", (reac: Reac) => reac.h, new Set([1.45])),
            mkTestProp("n", (reac: Reac) => reac.n, new Set([0.04])),
            mkTestProp("o", (reac: Reac) => reac.o, new Set([0.46])),
        ];
        const test_results = [];
        if (!fds_data.reacs[0]) {
            test_results.push(
                verificationResult(
                    "failure",
                    "No REAC has been specified",
                ),
            );
        } else if (fds_data.reacs.length > 1) {
            test_results.push(
                verificationResult(
                    "failure",
                    "No REAC has been specified",
                ),
            );
        } else {
            for (
                const test_result of tests.map((test) =>
                    test(fds_data, fds_data.reacs[0])
                )
            ) {
                test_results.push(test_result);
            }
        }
        return test_results;
    },
};

export const visibility_factor: Test = {
    id: "input.reac.visibilityFactor",
    func: function (fds_data: FdsFile): VerificationResult[] {
        const vis = fds_data.visibility_factor;
        let visibility_factor;
        if (!vis) {
            return [
                verificationResult(
                    "failure",
                    "Visibility Factor Not Set",
                ),
            ];
        } else {
            visibility_factor = vis;
        }

        if (visibility_factor === 3.0 || visibility_factor === 8.0) {
            return [verificationResult(
                "success",
                `Visibility Factor is ${visibility_factor}, a known value.`,
            )];
        } else {
            return [verificationResult(
                "failure",
                `Visibility Factor is {visibility_factor}. Known good visibility factors are 3 and 8.`,
            )];
        }
    },
};

export const maximum_visibility: Test = {
    id: "input.reac.maximumVisibility",
    func: function (fds_data: FdsFile): VerificationResult[] {
        const vis = fds_data.ec_ll && fds_data.visibility_factor
            ? fds_data.visibility_factor / fds_data.ec_ll
            : undefined;
        let maximum_visibility;
        if (!vis) {
            return [
                verificationResult(
                    "failure",
                    "Maximum Visibility Not Set",
                ),
            ];
        } else {
            maximum_visibility = vis;
        }

        if (maximum_visibility >= 100.0) {
            return [verificationResult(
                "success",
                `Maximum Visibility is ${maximum_visibility} m, at least 100 m.`,
            )];
        } else {
            return [verificationResult(
                "failure",
                `Maximum Visibility is ${maximum_visibility}. This is a low value and may cause issues when try to visualise results.`,
            )];
        }
    },
};

export const nframes_test: Test = {
    id: "input.dump.nFrames",
    func: function (fds_data: FdsFile): VerificationResult[] {
        function getSimTimes(fds_data: FdsFile): [number, number] {
            if (fds_data.time) {
                return [fds_data.time.begin ?? 0, fds_data.time.end ?? 0];
            } else {
                return [0.0, 1.0];
            }
        }
        if (fds_data.dump.nframes) {
            const [tStart, tEnd] = getSimTimes(fds_data);
            const simInterval = Math.round(tEnd - tStart);
            const s = simInterval % fds_data.dump.nframes;
            if (s === 0) {
                return [verificationResult(
                    "success",
                    `Value ${fds_data.dump.nframes}, results in round number of frames`,
                )];
            } else {
                return [
                    verificationResult(
                        "failure",
                        `Value ${fds_data.dump.nframes} may result in clipped output`,
                    ),
                ];
            }
        } else {
            return [
                verificationResult("failure", "NFRAMES not specified"),
            ];
        }
    },
};

export const flowCoverage: Test = {
    id: "input.measure.flow",
    /// Ensure that everage flow device is covered by a flow rate device. TODO: does not cover HVAC.
    func: function flowCoverage(fds_data: FdsFile): VerificationResult[] {
        // it is also possible that other objects (such as OBST have flow)
        const vents = fds_data.meshes.flatMap((mesh) => mesh.vents ?? []);
        // TODO: obsts
        // const obsts = getObsts(fds_data);
        // vents which may have a flow
        const ventsWithFlows: Vent[] = vents.filter((vent) =>
            ventHasFlow(fds_data, vent)
        );
        // obsts that have surfaces with flows
        // const obstWithFlows: any[] = obsts.filter((obst) =>
        //   obstHasFlow(fds_data, obst)
        // );
        // for each of the vents, ensure there is a flow device with the same
        // dimensions find those which do not
        const notCovered: Vent[] = ventsWithFlows
            .filter((vent) => !hasFlowDevc(fds_data, vent));
        if (notCovered.length === 0) {
            return [
                verificationResult(
                    "success",
                    "All Flows Vents and Obsts Measured",
                ),
            ];
        } else {
            const issues: VerificationResult[] = notCovered
                .map((vent) =>
                    verificationResult(
                        "failure",
                        `Vent \`${vent.id}\` has no adequate volume flow measuring device`,
                    )
                );
            return issues;
        }
    },
};

export const devicesTest: Test = {
    id: "input.measure.device.inSolid",
    /// Ensure that no devices are stuck in solids.
    func: function devicesTest(fds_data: FdsFile): VerificationResult[] {
        const stuckDevices: Devc[] = fds_data
            .devices
            // ND: we only perform this check for devices with a prop id (which is
            // usually detectors and the like)
            .filter((devc) => stuckInSolid(devc) && devc.prop_id);
        if (stuckDevices.length === 0) {
            return [verificationResult("success", "No stuck devices")];
        } else {
            const issues: VerificationResult[] = stuckDevices
                .map((devc) =>
                    verificationResult(
                        "failure",
                        `Devc ${devc.id}` +
                            "Positioned within solid obstruction",
                    )
                );
            return issues;
        }
    },
};

export const spkDetCeilingTest: Test = {
    id: "input.measure.device.underCeiling",
    /// Ensure that sprinklers and smoke detectors are beneath a ceiling.
    func: function spkDetCeilingTest(fds_data: FdsFile): VerificationResult[] {
        const nonBeneathCeiling: Devc[] = fds_data
            .devices
            .filter((devc) =>
                devcIsSprinkler(fds_data, devc) ||
                devcIsSmokeDetector(fds_data, devc) ||
                devcIsThermalDetector(fds_data, devc)
            )
            .filter((devc) => !devcBeneathCeiling(devc));
        if (nonBeneathCeiling.length === 0) {
            return [verificationResult(
                "success",
                "All sprinklers and detectors are immediately below the ceiling",
            )];
        } else {
            const issues: VerificationResult[] = nonBeneathCeiling
                .map((devc) =>
                    verificationResult(
                        "failure",
                        `Devc \`${devc.id}\` is not immediately beneath solid obstruction`,
                    )
                );
            return issues;
        }
    },
};

/// Test the growth rate of a burner and check that it either matches a standard
/// growth rate, or a steady-state value within 20 s.
export const growth_rate_test: Test = {
    id: "input.burner.growthRate",
    func: function (
        fds_data: FdsFile,
    ): VerificationResult[] {
        const results: VerificationResult[] = [];
        for (const burner of get_burners(fds_data)) {
            // TODO: This requires understanding the burner and it's exposed surfaces
            // TODO: allow steady state curves
            const surface = getBurnerSurf(fds_data, burner);
            if (!surface) return [];
            const tau_q = surface?.tau_q;

            // if (!tau_qs.all((x) => x === tau_q)) {
            //   // If all TAU_Qs are no the same, test fails
            //   results.push({
            //     type: "failure",
            //     message: "Multiple different TAU_Q values",
            //   });
            // }
            const specifiedAlpha = max_hrr(burner) / Math.abs(tau_q) ** 2;

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
                results.push({
                    type: "warning",
                    message:
                        "No growth rate specified. If steady-state is intended a ramp-up of 30 s should be used.",
                });
            } else if (tau_q < -30) {
                results.push({
                    type: "success",
                    message: `Growth rate is 30 s (as used for steady-state)`,
                });
            } else if (min_diff < 0.001) {
                results.push({
                    type: "success",
                    message:
                        `Alpha matches standard value, tau_q: ${tau_q} s, α: ${specifiedAlpha} (${matchingGrowthRate}), maxHRR: ${
                            max_hrr(burner)
                        } kW`,
                });
            } else {
                results.push({
                    type: "failure",
                    message:
                        `Alpha value deviates from standard values, tau_q: ${tau_q} s, α: ${specifiedAlpha} (${matchingGrowthRate}), maxHRR: ${
                            max_hrr(burner)
                        } kW`,
                });
            }
        }
        return results;
    },
};

export const burner_exists: Test = {
    id: "input.burner.exists",
    func: function (
        fds_data: FdsFile,
    ): VerificationResult[] {
        const n_burners = get_burners(fds_data).length;
        if (n_burners > 0) {
            return [{
                type: "success",
                message: `${n_burners} burners were found`,
            }];
        } else {
            return [{
                type: "failure",
                message: "No burners",
            }];
        }
    },
};
