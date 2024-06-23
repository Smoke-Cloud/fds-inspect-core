import type {
    Burner,
    FdsData,
    IjkBounds,
    Mesh,
    Obst,
    Resolution,
    Vent,
    Xb,
} from "./fds.ts";

/** A summary of key information about an FDS input file. */
export interface InputSummary {
    /** The specified CHID */
    chid: string;
    /** The specified length of the simulation in seconds */
    simulation_length: number;
    /** The number of vents and obstructions that produce HRR */
    n_burners: number;
    /** Peak HRR in Watts */
    total_max_hrr: number;
    /** The heat of combustion in J/kg as calculated from REAC properties */
    heat_of_combustion_calc: number;
    /** The heat of combustion in J/kg as determined by FDS */
    heat_of_combustion: number;
    /** Given all of the known burners, what is the peak soot production rate in
     * kg/s */
    total_soot_production: number;
    /** The number of sprinklers in the model */
    n_sprinklers: number;
    /** The activation temperatures of the sprinklers in the model */
    sprinkler_activation_temperatures: number[];
    /** The number of smoke detectors in the model */
    n_smoke_detectors: number;
    /** The activation obscurations of the smoke detectors in the model */
    smoke_detector_obscurations: number[];
    /** The number of extract vents in the model */
    n_extract_vents: number;
    /** The total extract rate if all vents are at peak flow in m³/s */
    total_extract_rate: number;
    /** The number of supply vents in the model */
    n_supply_vents: number;
    /** The total supply rate if all vents are at peak flow in m³/s */
    total_supply_rate: number;
    /** The total number of meshes */
    n_meshes: number;
    /** The total number of cells */
    n_cells: number;
    /** The mesh resolutions */
    mesh_resolutions: Resolution[];
    // ndrs: number[][];
    /** Ceiling heights found where the greatest horizontal extent occurs */
    ceiling_heights: { height: number; area: number }[];
}

function heat_of_combustion(fdsData: FdsData): number {
    const reac = fdsData.reacs[0];
    const y_s = reac.soot_yield ?? 0.0;
    const y_co = reac.co_yield ?? 0.0;
    const soot_h_fraction = reac.soot_h_fraction ?? 0.1;
    const epumo2 = reac.epumo2 ?? 13100.0;
    // -- for fuel molecule CxHyOzNv
    // TODO: add defaults
    const x = reac.c ?? 0.0;
    const y = reac.h ?? 0.0;
    const z = reac.o ?? 0.0;
    const v = reac.n ?? 0.0;

    const w_c = 12.01; // Molar mass of atomic carbon.
    const w_h = 1.008; // Molar mass of atomic hydrogen.
    const w_o = 15.999; // Molar mass of atomic oxygen.
    const w_n = 14.007; //Molar mass of atomic nitrogen.

    const w_o2 = w_o * 2.0;
    const w_co = 1.0 * w_c + 1.0 * w_o;

    const v_F = 1.0;

    // Molar mass of fuel.
    const w_F = x * w_c + y * w_h + z * w_o + v * w_n;

    // 'v_' represents molar fraction
    const w_S = soot_h_fraction * w_h + (1.0 - soot_h_fraction) * w_c;
    const v_s = w_F / w_S * y_s;
    const v_co = w_F / w_co * y_co;
    const v_co2 = x - v_co - (1.0 - soot_h_fraction) * v_s;
    const v_h2o = y / 2.0 - soot_h_fraction / 2.0 * v_s;
    const v_o2 = v_co2 + v_co / 2.0 + v_h2o / 2.0 - z / 2.0;
    // const v_n2 = v / 2.0;
    return v_o2 * w_o2 * epumo2 / (v_F * w_F);
}
function soot_production_rate(fdsData: FdsData): number {
    const reac = fdsData.reacs[0];
    const y_s = reac.soot_yield ?? 0.0;
    const hoc = heat_of_combustion(fdsData);
    const hrr = total_max_hrr(fdsData);
    return y_s / hoc * hrr;
}

function total_max_hrr(fdsData: FdsData): number {
    const burners: Burner[] = fdsData.burners;
    return burners.map((burner) => burner.maxHrr).reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0,
    );
}

/** Create an InputSummay from an FdsData.
 * @param fdsData The JSON object obtained from fds.
 * @returns An input summary
 */
export function summarise_input(fdsData: FdsData): InputSummary {
    const simulation_length = fdsData.time.end - fdsData.time.begin;
    // let ndrs: Vec<Vec<_>> = burners.iter().map(|burner| burner.ndr()).collect();

    const supplies = fdsData.supplies;
    const total_supply_rate = supplies.reduce(
        (acc, vent) => acc + (vent.flowRate ?? 0),
        0,
    );
    const extracts: Vent[] = fdsData.extracts;
    const total_extract_rate = extracts.reduce(
        (acc, vent) => acc + (vent.flowRate ?? 0),
        0,
    );

    const sprinklers = fdsData.devices.filter((devc) => devc.isSprinkler);
    const n_sprinklers = sprinklers.length;

    const sprinkler_activation_temperatures: number[] = [];
    for (const devc of sprinklers) {
        const prop = fdsData.props.find((prop) => prop.id === devc.prop_id);
        if (prop) {
            sprinkler_activation_temperatures.push(prop.activation_temperature);
        }
    }
    // smoke_detector_obscurations.dedup();
    sprinkler_activation_temperatures.sort();

    const smoke_detectors = fdsData.devices.filter((devc) =>
        devc.isSmokeDetector
    );
    const n_smoke_detectors = smoke_detectors.length;
    const smoke_detector_obscurations: number[] = [];
    for (const devc of smoke_detectors) {
        const prop = fdsData.props.find((prop) => prop.id === devc.prop_id);
        if (prop) {
            smoke_detector_obscurations.push(prop.activation_obscuration);
        }
    }
    // smoke_detector_obscurations.dedup();
    smoke_detector_obscurations.sort();

    return {
        chid: fdsData.chid,
        simulation_length,
        n_burners: fdsData.burners.length,
        total_max_hrr: total_max_hrr(fdsData),
        heat_of_combustion_calc: heat_of_combustion(fdsData),
        heat_of_combustion: fdsData.reacs[0]?.heat_of_combustion,
        total_soot_production: soot_production_rate(fdsData),
        n_sprinklers,
        sprinkler_activation_temperatures,
        n_smoke_detectors,
        smoke_detector_obscurations,
        n_extract_vents: extracts.length,
        total_extract_rate,
        n_supply_vents: supplies.length,
        total_supply_rate,
        n_meshes: fdsData.meshes.length,
        n_cells: countCells(fdsData),
        mesh_resolutions: fdsData.meshes.map((mesh) => mesh.cell_sizes),
        // ndrs,
        ceiling_heights: getCeilingHeights(fdsData),
    };
}

/** Count the total number of cells in the model.
 * @param fdsData The JSON object from FDS
 * @returns The total number of cells
 */
export function countCells(fdsData: FdsData): number {
    return fdsData.meshes.reduce(
        (accumulator, mesh) =>
            accumulator + (mesh.ijk.i * mesh.ijk.j * mesh.ijk.k),
        0,
    );
}

/**
 * The extent of meshes along an axis
 */
export interface Extents {
    axis: "x" | "y" | "z";
    areas: { start: number; end: number; area: number }[];
}

/**
 * Is this object flat along any of the listed axes?
 * @param axes The axis along which to check if the object is flat
 * @param value The object which has cell-bounds (such as an obstrucion)
 * @returns Is the object flat?
 */
export function obstFlat(
    axes: ("x" | "y" | "z")[],
    value: { bounds: IjkBounds },
): boolean {
    for (const axis of axes) {
        if (obstFlatAxis(axis, value)) {
            return true;
        }
    }
    return false;
}

function obstFlatAxis(
    axis: "x" | "y" | "z",
    value: { bounds: IjkBounds },
): boolean {
    switch (axis) {
        case "x":
            return value.bounds.i_min === value.bounds.i_max;
        case "y":
            return value.bounds.j_min === value.bounds.j_max;
        case "z":
            return value.bounds.k_min ===
                value.bounds.k_max;
    }
}

/**
 * Given two regions, see if they overlap.
 */
export function dimensionsOverlapXY(
    a: { x_min: number; x_max: number; y_min: number; y_max: number },
    b: { x_min: number; x_max: number; y_min: number; y_max: number },
): boolean {
    return (a.x_max > b.x_min && a.x_min < b.x_max) &&
        (a.y_max > b.y_min && a.y_min < b.y_max);
}

/**
 * Calculate the extents of meshes along an axis
 * @param axis The axis along which to calculate
 * @param meshes The meshes to calculate over
 * @returns the extents
 */
export function extents(
    axis: "x" | "y" | "z",
    meshes: Mesh[],
    opts?: { includeObts?: boolean },
): Extents {
    const includeObts = opts?.includeObts ?? true;
    interface Elem {
        value: number;
        area: number;
    }
    const elems: Elem[] = [];
    for (const mesh of meshes) {
        const meshDimensions = dimensions(axis, mesh);
        // TODO: Somehow need to account for obstructions that might be removed.
        const area = meshArea(axis, mesh);
        if (includeObts) {
            for (const obst of mesh.obsts ?? []) {
                elems.push({
                    value: dimensions(axis, obst).start,
                    area: -obstArea(axis, obst),
                });
                elems.push({
                    value: dimensions(axis, obst).end,
                    area: obstArea(axis, obst),
                });
            }
        }
        elems.push({
            value: meshDimensions.start,
            area: area,
        });
        elems.push({
            value: meshDimensions.end,
            area: -area,
        });
    }
    elems.sort((a, b) => a.value - b.value);
    const newElems: Elem[] = [];
    for (const elem of elems) {
        const prev = newElems[newElems.length - 1];
        if (elem.value === prev?.value) {
            prev.area += elem.area;
        } else {
            newElems.push(elem);
        }
    }
    const areasRep: { start: number; end: number; area: number }[] = [];
    let currentArea = 0;
    for (let i = 0; i < (newElems.length - 1); i++) {
        currentArea += newElems[i].area;
        areasRep.push({
            start: newElems[i].value,
            end: newElems[i + 1].value,
            area: currentArea,
        });
    }
    // remove duplicate areas
    const areas: { start: number; end: number; area: number }[] = [];
    for (const a1 of areasRep) {
        const prev = areas[areas.length - 1];
        if (a1.area === prev?.area) {
            prev.end = a1.end;
        } else {
            areas.push(a1);
        }
    }
    return { axis, areas };
}

/**
 * Given a collection of meshes, what is the bounding box of all meshes
 * combined. Returns undefined on an empty list.
 */
export function boundingExtent(meshes: Mesh[]): Xb | undefined {
    if (!meshes[0]) return;
    const current: Xb = {
        x1: meshes[0].dimensions.x1,
        x2: meshes[0].dimensions.x2,
        y1: meshes[0].dimensions.y1,
        y2: meshes[0].dimensions.y2,
        z1: meshes[0].dimensions.z1,
        z2: meshes[0].dimensions.z2,
    };
    for (const mesh of meshes) {
        current.x1 = Math.min(current.x1, mesh.dimensions.x1);
        current.x2 = Math.max(current.x2, mesh.dimensions.x2);
        current.y1 = Math.min(current.y1, mesh.dimensions.y1);
        current.y2 = Math.max(current.y2, mesh.dimensions.y2);
        current.z1 = Math.min(current.z1, mesh.dimensions.z1);
        current.z2 = Math.max(current.z2, mesh.dimensions.z2);
    }
    return current;
}

export function dimensionExtent(
    axis: "x" | "y" | "z",
    meshes: Mesh[],
    coord: [number, number],
): { start: number; end: number; gas: boolean }[] {
    interface Elem {
        value: number;
        area: number;
    }
    const extents: { start: number; end: number; gas: boolean }[] = [];
    for (const mesh of meshes) {
        // Check that mesh overlaps
        if (
            !(
                (mesh.dimensions.x1 <= coord[0] &&
                    mesh.dimensions.x2 >= coord[0]) &&
                (mesh.dimensions.y1 <= coord[1] &&
                    mesh.dimensions.y2 >= coord[1])
            )
        ) {
            continue;
        }
        // console.log(mesh.index, mesh.id);
        const meshDimensions = dimensions(axis, mesh);
        extents.push({
            start: meshDimensions.start,
            end: meshDimensions.end,
            gas: true,
        });
        // Iterate through the obsts, finding those that overlap
        const overlappingObsts: Obst[] = [];
        for (const obst of mesh.obsts ?? []) {
            if (
                (obst.dimensions.x1 <= coord[0] &&
                    obst.dimensions.x2 >= coord[0]) &&
                (obst.dimensions.y1 <= coord[1] &&
                    obst.dimensions.y2 >= coord[1])
            ) {
                overlappingObsts.push(obst);
            }
        }
        // console.log(overlappingObsts);
        for (const obst of overlappingObsts) {
            const obstDims = dimensions(axis, obst);
            extents.push({
                start: obstDims.start,
                end: obstDims.end,
                gas: false,
            });
        }
    }
    return extents;
}

export interface RegionExtents {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    extents: { start: number; end: number; gas: boolean }[];
    subs: RegionExtents[];
}

export function clearHeights(
    regionExtents: CellMap,
): { height: number; area: number }[] {
    // TODO: this is incorrect
    const vals = [];
    const base = {
        area: (regionExtents.mesh.dimensions.x2 -
            regionExtents.mesh.dimensions.x1) *
            (regionExtents.mesh.dimensions.y2 -
                regionExtents.mesh.dimensions.y1),
        height: regionExtents.extents.reduce(
            (acc, succs) =>
                acc +
                succs.reduce((ac, succ) => ac + (succ.end - succ.start), 0),
            0,
        ),
    };
    // for (const sub of regionExtents.extents) {
    //   const area = (sub.x_max - sub.x_min) * (sub.y_max - sub.y_min);
    //   const height = regionExtents.extents.reduce(
    //     (acc, succ) => acc + (succ.end - succ.start),
    //     0,
    //   );
    //   base.area -= area;
    //   vals.push({ area, height });
    // }
    vals.push(base);
    return vals;
}

function dimensions(axis: "x" | "y" | "z", value: { dimensions: Xb }) {
    switch (axis) {
        case "x":
            return { start: value.dimensions.x1, end: value.dimensions.x2 };
        case "y":
            return { start: value.dimensions.y1, end: value.dimensions.y2 };
        case "z":
            return { start: value.dimensions.z1, end: value.dimensions.z2 };
    }
}

function obstArea(axis: "x" | "y" | "z", obst: Obst) {
    switch (axis) {
        case "x":
            return obst.fds_area.x;
        case "y":
            return obst.fds_area.y;
        case "z":
            return obst.fds_area.z;
    }
}

function meshArea(axis: "x" | "y" | "z", mesh: Mesh): number {
    switch (axis) {
        case "x":
            return meshAreaX(mesh);
        case "y":
            return meshAreaY(mesh);
        case "z":
            return meshAreaZ(mesh);
    }
}

function meshAreaX(mesh: Mesh): number {
    return (mesh.dimensions.z2 - mesh.dimensions.z1) *
        (mesh.dimensions.y2 - mesh.dimensions.y1);
}

function meshAreaY(mesh: Mesh): number {
    return (mesh.dimensions.x2 - mesh.dimensions.x1) *
        (mesh.dimensions.z2 - mesh.dimensions.z1);
}

function meshAreaZ(mesh: Mesh): number {
    return (mesh.dimensions.x2 - mesh.dimensions.x1) *
        (mesh.dimensions.y2 - mesh.dimensions.y1);
}

export function greatestExtent(axis: "x" | "y" | "z", fdsFile: FdsData): {
    start: number;
    end: number;
    area: number;
} {
    const exts = extents(axis, fdsFile.meshes ?? []);
    let greatestExtent = exts.areas[0];
    for (const ext of exts.areas) {
        if (ext.area > greatestExtent.area) {
            greatestExtent = ext;
        }
    }
    return greatestExtent;
}

export function getCeilingHeights(
    fdsFile: FdsData,
): { height: number; area: number }[] {
    const g = greatestExtent("z", fdsFile);
    const avg = (g.end + g.start) / 2;
    const regionExtents = getRegionExtents(fdsFile, avg);

    const heights = new Map();
    for (const re of regionExtents) {
        for (const h of clearHeights(re)) {
            const existing = heights.get(h.height);
            heights.set(h.height, existing ? existing + h.area : h.area);
        }
    }
    const arrHeights = Array.from(heights).map(([a, b]) => ({
        height: a,
        area: b,
    }));
    arrHeights.sort((a, b) => b.area - a.area);
    return arrHeights;
}

// export class RegionPartition {
//   private regions: RegionExtents[] = [];
//   constructor(base: RegionExtents) {
//     this.regions.push(base);
//   }
//   // Add a region making sure there is no overlap in the x-dimension
//   addRegion(region: RegionExtents) {
//     // Special case above or below.
//     if (
//       (region.x_max <= this.regions[0].x_min) ||
//       (region.x_min >= this.regions[0].x_max)
//     ) {
//       this.regions.sort((a, b) => a.x_min - b.x_min);
//     } else {
//       console.error(this.regions);
//       console.error(region);
//       throw new Error("overlapping");
//     }
//   }
// }

export class CellMap {
    public extents: { start: number; end: number }[][] = [];
    public i_max: number;
    public j_max: number;
    public k_max: number;
    constructor(public mesh: Mesh) {
        this.i_max = mesh.ijk.i;
        this.j_max = mesh.ijk.j;
        this.k_max = mesh.ijk.k;
    }
    addExtent(i: number, j: number, extent: { start: number; end: number }) {
        const n = this.fromIJ(i, j);
        const exs = this.extents[n];
        if (exs) {
            exs.push(extent);
        } else {
            this.extents[n] = [extent];
        }
    }
    toIJ(n: number): { i: number; j: number } {
        const i = Math.floor(n / this.i_max);
        const j = n % this.i_max;
        return { i, j };
    }
    fromIJ(i: number, j: number): number {
        return this.i_max * i + j;
    }
}

export function getRegionExtents(
    fdsFile: FdsData,
    val: number,
): CellMap[] {
    const regionExtents: CellMap[] = [];
    for (const mesh of fdsFile.meshes) {
        if (mesh.dimensions.z1 <= val && mesh.dimensions.z2 >= val) {
            const cellMap = new CellMap(mesh);
            for (const obst of mesh.obsts ?? []) {
                if (obstFlat(["x", "y"], obst)) continue;
                // iterate through ijk
                for (let i = obst.bounds.i_min; i < obst.bounds.i_max; i++) {
                    for (
                        let j = obst.bounds.j_min;
                        j < obst.bounds.j_max;
                        j++
                    ) {
                        cellMap.addExtent(i, j, {
                            start: obst.bounds.k_min,
                            end: obst.bounds.k_max,
                        });
                    }
                }
            }
            regionExtents.push(cellMap);
        }
    }
    return regionExtents;
}
