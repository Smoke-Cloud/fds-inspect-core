export interface Xyz {
  x: number;
  y: number;
  z: number;
}

export interface Xb {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  z1: number;
  z2: number;
}

export interface Mesh {
  index: number;
  id: string;
  ijk: {
    i: number;
    j: number;
    k: number;
  };
  dimensions: Xb;
  cell_sizes: Resolution;
  vents: Vent[];
  obsts: Obst[];
}

export interface Reac {
  // a: number;
  // auto_ignition_temperature: number;
  c: number;
  // check_atom_balance: boolean;
  co_yield: number;
  // critical_flame_temperature: number;
  // e: number;
  epumo2: number;
  // k: number;
  // equation: string;
  // fixed_mix_time: number;
  // formula: string;
  // fuel: string;
  // fuel_radcal_id: string;
  // fyi: string;
  h: number;
  // hcn_yield: number;
  // hoc_complete: number;
  heat_of_combustion: number;
  // id: string;
  // ideal: boolean;
  // lower_oxygen_limit: number;
  n: number;
  // nu: number[];
  // n_s: number[];
  // n_t: number;
  o: number;
  // priority: number;
  // radiative_fraction: number;
  // ramp_chi_r: string;
  // reac_atom_error: number;
  // reac_mass_error: number;
  // reverse: boolean;
  soot_h_fraction?: number;
  soot_yield: number;
  // spec_id_n_s: string[];
  // spec_id_nu: string[];
  // third_body: boolean;
}

// export interface Resolution {
//   dx_min: number;
//   dx_max: number;
//   dy_min: number;
//   dy_max: number;
//   dz_min: number;
//   dz_max: number;
// }

export interface Resolution {
  dx: number;
  dy: number;
  dz: number;
}

export interface Devc {
  index: number;
  id: string;
  label: string;
  spatial_statistic: string;
  spec_id: string;
  prop_id: string;
  mesh: number;
  setpoint: number;
  dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  location: Xyz;
  quantities: string[];
  points: DevcPoint[];
}

export interface DevcPoint {
  i: number;
  j: number;
  k: number;
  init_solid: boolean;
  init_solid_zplus?: boolean;
}

export interface Surf {
  index: number;
  id: string;
  hrrpua: number;
  tmp_front?: number;
  tau_q: number;
  mlrpua: number;
  vel: number;
  volume_flow: number;
}

export interface Hvac {
  vent_id: string;
  vent2_id: string;
}

export interface Prop {
  index: number;
  id: string;
  part_id: string;
  spec_id: string;
  quantity: string;
  activation_temperature: number;
  activation_obscuration: number;
  flow_rate: number;
  particle_velocity: number;
}

export interface Part {
  index: number;
  id: string;
  spec_id?: string;
  devc_id?: string;
  ctrl_id?: string;
  surf_id?: string;
  prop_id?: string;
  diameter: string;
  monodisperse: boolean;
  age: number;
  sampling_factor: number;
}

export interface FdsFile {
  chid: string;
  ec_ll: number;
  visibility_factor: number;
  dump: {
    nframes: number;
  };
  time: {
    begin: number;
    end: number;
  };
  surfaces: Surf[];
  meshes: Mesh[];
  devices: Devc[];
  hvac: Hvac[];
  props: Prop[];
  parts: Part[];
  reacs: Reac[];
}

export interface Vent {
  index: number;
  id: string;
  surface: string;
  devc_id: string;
  ctrl_id: string;
  dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  fds_area: number;
}

export interface Obst {
  index: number;
  id: string;
  surfaces?: {
    x_min: string;
    x_max: string;
    y_min: string;
    y_max: string;
    z_min: string;
    z_max: string;
  };
  devc_id: string;
  ctrl_id: string;
  dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  fds_area: {
    x: number;
    y: number;
    z: number;
  };
}

export interface TestResult {
  message: string;
}

export interface VerificationSummary {
  result: VerificationResult | undefined;
}

export interface VerificationResult {
  name: string;
  type: "success" | "warning" | "failure";
  value: TestResult | VerificationResult[];
}

function worstCategory(
  result: VerificationResult,
): "success" | "warning" | "failure" {
  if (result.value instanceof Array) {
    return worstCategoryArray(result.value);
  } else {
    return result.type;
  }
}

function worstCategoryArray(result: VerificationResult[]) {
  let worst: "success" | "warning" | "failure" = "success";
  for (const test of result) {
    const next = worstCategory(test);
    if (next === "failure") worst = "failure";
    if (next === "warning" && worst !== "failure") worst = "warning";
  }
  return worst;
}

function verificationResult(
  a: string,
  type: "success" | "warning" | "failure",
  b: TestResult | VerificationResult[],
): VerificationResult {
  return { name: a, type, value: b };
}

export function verifyInput(fds_data: FdsFile): VerificationSummary {
  const value: VerificationResult[] = [
    meshes_overlap_test(fds_data),
    // burners_test(fds_data),
    parameters_test(fds_data),
    // outputDataCoverage(fds_data),
    flowCoverage(fds_data),
    // leakage(fds_data),
    devicesTest(fds_data),
    spkDetCeilingTest(fds_data),
    flowTemp(fds_data),
  ];
  const result: VerificationResult = {
    name: "Verification Tests",
    type: worstCategoryArray(value),
    value,
  };
  return {
    result,
  };
}

function isLinkedToVent(vent: Vent, hvac: Hvac): boolean {
  if (vent.id) {
    return hvac.vent_id === vent.id || hvac.vent2_id === vent.id;
  } else {
    return false;
  }
}

function surfHasFlow(surf: Surf): boolean {
  return surf.mlrpua != null ||
    surf.hrrpua != null ||
    surf.vel != null ||
    surf.volume_flow != null;
}

function getSurf(fds_data: FdsFile, surfaceName: string): Surf | undefined {
  for (const surf of fds_data.surfaces) {
    if (surf.id === surfaceName) {
      return surf;
    }
  }
}

function ventHasFlow(fds_data: FdsFile, vent: Vent): boolean {
  // TODO: reenable
  // const linkedHVACs = fds_data.hvac.filter((hvac) =>
  //   isLinkedToVent(vent, hvac)
  // );
  // const isHVAC = linkedHVACs.length != 0;
  const isHVAC = false;
  const surfaceName = vent.surface;
  const surface = getSurf(fds_data, surfaceName);
  if (!surface) return false;
  const hasSurfFlow = surfHasFlow(surface);
  return isHVAC || hasSurfFlow;
}

/// Ensure that everage flow device is covered by a flow rate device. TODO: does not cover HVAC.
function flowCoverage(fds_data: FdsFile): VerificationResult {
  const name = "Flow Coverage Test";
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
    return verificationResult(name, "success", {
      message: "All Flows Vents and Obsts Measured",
    });
  } else {
    const issues: VerificationResult[] = notCovered
      .map((vent) =>
        verificationResult(`Vent '${vent.id}' Flow Measurement`, "failure", {
          message: "No adequate flow measuring device for this vent",
        })
      );
    return verificationResult(
      "The following objects have issues with their flow measurements",
      worstCategoryArray(issues),
      issues,
    );
  }
}

// function isScreenPart(part:Part): boolean{
//     return  part.drag_law === "SCREEN"
// }

// function hasInertOrDefaultSurf(part:Part): boolean {
//     if (part.surf_id) {
//         return    part.surf_id === "INERT"
//     } else {
//         return   true
//     }
// }

// function leakage(fds_data:FdsFile): VerificationResult {
//     let testName = "Leakage Implementation Test";
//     let screen_parts: any[]= fds_data .part .filter((part) => isScreenPart(part))
//         ;
//     let issues = screen_parts

//         .map((part) => {
//             if (hasInertOrDefaultSurf(part)) {
//                 return   [`Screen ${part.id} Surface`,{type:"failure",message:"Has an INERT or default material type"},]
//             } else {
//                 return   [`Screen ${part.id} Surface`,{type:"failure",message:"Has a specified material type"},]
//             }
//         })
//         ;
//     ["Screen Material Type", issues]
// }

/// Check if a device is stuck in a solid. Returns Nothing if it's not a
/// sensible question (e.g. it is not a point device).
function stuckInSolid(devc: Devc): boolean {
  for (const point of devc.points) {
    if (point.init_solid) {
      return true;
    }
  }
  return false;
}

/// Ensure that no devices are stuck in solids.
function devicesTest(fds_data: FdsFile): VerificationResult {
  const name = "Devices Stuck in Solids Test";
  const stuckDevices: Devc[] = fds_data
    .devices
    // ND: we only perform this check for devices with a prop id (which is
    // usually detectors and the like)
    .filter((devc) => stuckInSolid(devc) && devc.prop_id);
  if (stuckDevices.length === 0) {
    return verificationResult(name, "success", {
      message: "No stuck devices",
    });
  } else {
    const issues: VerificationResult[] = stuckDevices
      .map((devc) =>
        verificationResult(`Devc ${devc.id}`, "failure", {
          message: "Positioned within solid obstruction",
        })
      );
    return verificationResult(
      "The following devices have issues with their positions",
      worstCategoryArray(issues),
      issues,
    );
  }
}

// TODO: check for flow
function devcIsSprinkler(fds_data: FdsFile, devc: Devc): boolean {
  if (devc.prop_id) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (!prop) return false;
    return isSprinklerProp(prop);
  } else {
    return false;
  }
}

function devcIsThermalDetector(fds_data: FdsFile, devc: Devc): boolean {
  if (devc.prop_id) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (!prop) return false;
    return isThermalDetectorProp(prop);
  } else {
    return false;
  }
}

function isThermalDetectorProp(prop: Prop): boolean {
  return prop.quantity === "LINK TEMPERATURE";
}

function isSprinklerProp(prop: Prop): boolean {
  return prop.quantity === "SPRINKLER LINK TEMPERATURE";
}

function isSmokeDetectorProp(prop: Prop): boolean {
  return prop.quantity === "CHAMBER OBSCURATION";
}

function devcIsSmokeDetector(fds_data: FdsFile, devc: Devc): boolean {
  if (devc.prop_id) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (!prop) return false;
    return isSmokeDetectorProp(prop);
  } else {
    return false;
  }
}

/// Check if the cell directly above a device is solid. This is useful to make
/// sure that sprinklers and smoke detectors are directly beneath the a ceiling.
///
/// TODO: This is more complicated as it may not be a solid cell, but a solid
/// surface. This is exacerbated by being on a mesh boundary.
function devcBeneathCeiling(devc: Devc): boolean {
  return devc.points.every(pointBeneathCeiling);
}

function pointBeneathCeiling(point: DevcPoint): boolean {
  return point.init_solid_zplus !== false;
}

// function getFaceXB(fds_data:FdsFile, cell: ([number, ([number, number, number])]), dir: Direction): Xb |undefined {
//     let cellXB = getCellXB(fds_data, cell) ;
//     if (!cellXB)return;
//     let   {
//         x1,
//         x2,
//         y1,
//         y2,
//         z1,
//         z2,
//     } = cellXB ;
//     switch (dir) {
//         case Direction.NegX:
//             return xbNew(x1, x1, y1, y2, z1, z2);
//         case  Direction.PosX:
//             return  xbNew(x2, x2, y1, y2, z1, z2);
//         case  Direction.NegY :
//             return xbNew(x1, x2, y1, y1, z1, z2);
//             case  Direction.PosY:
//             return  xbNew(x1, x2, y2, y2, z1, z2);
//             case  Direction.NegZ :
//             return  xbNew(x1, x2, y1, y2, z1, z1);
//             case  Direction.PosZ :
//             return  xbNew(x1, x2, y1, y2, z2, z2);
//     }
// }

// /// Get the solidness of a single face at cell @cell@ and direction @dir@. NB:
// /// This does not consider neighbouring cells.
// function isFaceSolid(
//     fds_data:FdsFile,
//     cell: [number, [number, number, number]],
//     direction: Direction,
// ): boolean {
//     let cellSize = getMinDim(fds_data, cell).unwrap();
//     let faceXB = getFaceXB(fds_data, cell, direction);
//     // Exclude 'OPEN' vents and obsts, as they are not solid
//     let solidObsts: any[]= fds_data
//         .obst

//         .filter((obst) => !hasOpenSurf(fds_data, *obst))
//         ;
//     let solidVents: any[]= fds_data
//         .vent

//         .filter((vent) => !hasOpenSurf(fds_data, *vent))
//         ;
//     let obstsAndVentsXBs = [];
//     for (obst of solidObsts) {
//         obstsAndVentsXBs.push(obst.xb);
//     }
//     for (vent of solidVents) {
//         if (vent.xb ){
//             obstsAndVentsXBs.push(vent.xb );
//         }
//     }
//     if (obstsAndVentsXBs

//         .any((xb)=> faceOccupy(cellSize,  xb, faceXB)))
//     {
//         true
//     } else {
//         // Face is an external mesh boundary
//         isFaceExternalMeshBoundary(fds_data, cell, Direction.PosZ) // TODO: check direction here
//             // Which is not covered by an 'OPEN' vent
//             && (!(isFaceOpenVent(fds_data, cell, Direction.PosZ)))
//     }
// }

// function xbNew(x1:number,x2:number,y1:number,y2:number,z1:number,z2:number):Xb {
//     return {x1,x2,y1,y2,z1,z2}
// }

// // /// Determine if a face is an external mesh boundary. I.e., it could be 'OPEN'.
// // function isFaceExternalMeshBoundary(
// //     fds_data:FdsFile,
// //     cell @ (meshNum, (i, j, k)): Cell,
// //     dir: Direction,
// // ): boolean {
// //     let mesh = fds_data.meshes[meshNum].unwrap();
// //     // -- First we need to determine if the cell is on the edge of the mesh (in
// //     // -- the chosen direction) | @cellN@ is the cell number in the chosen
// //     // -- direction
// //     let cellN = match dir {
// //         Direction.PosX => i,
// //         Direction.NegX => i,
// //         Direction.PosY => j,
// //         Direction.NegY => j,
// //         Direction.PosZ => k,
// //         Direction.NegZ => k,
// //     };
// //     let (meshMaxI, meshMaxJ, meshMaxK) = {
// //         // -- These are lines not cells
// //         let (xs, ys, zs) = getMeshLines(fds_data, meshNum, mesh).unwrap();
// //         let nCellsI = xs.len() - 1;
// //         let nCellsJ = ys.len() - 1;
// //         let nCellsK = zs.len() - 1;
// //         // -- We need to subtract 1 to go from the quantity to the max index
// //         (nCellsI - 1, nCellsJ - 1, nCellsK - 1)
// //     };
// //     // -- | @maxCellN@ is the boundary cell number of the mesh in the chosen
// //     // -- direction
// //     let maxCellN = match dir {
// //         Direction.PosX => meshMaxI,
// //         Direction.NegX => 0,
// //         Direction.PosY => meshMaxJ,
// //         Direction.NegY => 0,
// //         Direction.PosZ => meshMaxK,
// //         Direction.NegZ => 0,
// //     };
// //     // -- This determines if the cell is at the edge of the mesh in the chosen
// //     // -- direction.
// //     let cellIsMeshBoundary = cellN === maxCellN;
// //     // -- TODO: how do we determine if the cell is external?
// //     // --
// //     // -- Next we need to determine if there is another mesh on the other side
// //     // -- of this boundary. I.e., determine whether it is external.
// //     // --
// //     // -- To do this we will take the midpoint of the face, then go "up" a
// //     // -- small amount in the direction of the normal axis. We will then check
// //     // -- if this point lies within another mesh. This is not a great way to do
// //     // -- this, but it will suffice for now, until we have better data
// //     // -- structures in place.
// //     // --
// //     // -- TODO: improve this.
// //     let faceMidPoint = {
// //         let Xb {
// //             x1,
// //             x2,
// //             y1,
// //             y2,
// //             z1,
// //             z2,
// //         } = getFaceXB(fds_data, cell, dir);
// //         match dir {
// //             Direction.PosX => (xbNew(x2, x2, y1, y2, z1, z2)).midpoint(),
// //             Direction.NegX => (xbNew(x1, x1, y1, y2, z1, z2)).midpoint(),
// //             Direction.PosY => (xbNew(x1, x2, y2, y2, z1, z2)).midpoint(),
// //             Direction.NegY => (xbNew(x1, x2, y1, y1, z1, z2)).midpoint(),
// //             Direction.PosZ => (xbNew(x1, x2, y1, y2, z2, z2)).midpoint(),
// //             Direction.NegZ => (xbNew(x1, x2, y1, y2, z1, z1)).midpoint(),
// //         }
// //     };
// //     let eps = 0.000001;
// //     let faceMidPointPlus
// //      switch (dir)   {
// //        case Direction.PosX :
// //         faceMidPointPlus = addXyz(
// //             faceMidPoint,
// //              {
// //                 x: eps,
// //                 y: 0.0,
// //                 z: 0.0,
// //             },
// //         ),
// //             break;
// //             case     Direction.NegX :
// //         faceMidPointPlus =  addXyz(
// //             faceMidPoint,
// //              {
// //                 x: (-eps),
// //                 y: 0.0,
// //                 z: 0.0,
// //             },
// //         ),
// //             break;
// //             case     Direction.PosY :
// //         faceMidPointPlus =  addXyz(
// //             faceMidPoint,
// //              {
// //                 x: 0.0,
// //                 y: eps,
// //                 z: 0.0,
// //             },
// //         ),
// //             break;
// //             case      Direction.NegY :
// //         faceMidPointPlus =  addXyz(
// //             faceMidPoint,
// //              {
// //                 x: 0.0,
// //                 y: (-eps),
// //                 z: 0.0,
// //             },
// //         ),
// //             break;
// //             case    Direction.PosZ :
// //         faceMidPointPlus =  addXyz(
// //             faceMidPoint,
// //              {
// //                 x: 0.0,
// //                 y: 0.0,
// //                 z: eps,
// //             },
// //         ),
// //             break;
// //             case    Direction.NegZ :
// //         faceMidPointPlus =  addXyz(
// //             faceMidPoint,
// //              {
// //                 x: 0.0,
// //                 y: 0.0,
// //                 z: (-eps),
// //             },
// //         ),
// //     };
// //    return  cellIsMeshBoundary &&
// //             // check if the point just over the bounday is within any mesh
// //             !fds_data.meshes.any((mesh) => isInMesh(faceMidPointPlus,mesh))
// // }

// function addXyz(a: Xyz, b: Xyz): Xyz {
//     return {
//         x: a.x + b.x,
//         y: a.y + b.y,
//         z: a.z + b.z,
//     };
// }

// type Cell = [number, [number, number, number]];

// // /// Determine if a face is an 'OPEN' vent at cell @cell@ and direction @dir@.
// // /// NB: This does not consider MB style mesh boundary specs
// // function isFaceOpenVent(fds_data:FdsFile, cell: Cell, dir: Direction): boolean {
// //     let cellSize = getMinDim(fds_data, cell).unwrap();
// //     let faceXB = getFaceXB(fds_data, cell, dir);
// //     let openObsts: any[]= fds_data
// //         .obst

// //         .filter((obst) => hasOpenSurf(fds_data, obst))
// //         ;
// //     let openVents: any[]= fds_data
// //         .vent

// //         .filter((vent) => hasOpenSurf(fds_data, vent))
// //         ;
// //     let obstsAndVentsXBs = [];
// //     for (obst of openObsts) {
// //         obstsAndVentsXBs.push(obst.xb);
// //     }
// //     for (vent of openVents) {
// //         if (vent.xb) {
// //             obstsAndVentsXBs.push(vent.xb);
// //         }
// //     }
// //     obstsAndVentsXBs

// //         .any(|(xb)=> faceOccupy(cellSize,  xb, faceXB))
// // }

// /// Determine if if the first XB occupies more than or equal to 50% of the
// // second XB in all dimensions. This is used to determine if an obstruction
// // (first XB) causes a cell (second XB) to be solid or not.
// // function xbOccupy(xbA: Xb, xbB: Xb): boolean {

// //     let occupyX = occupyFatly((xbA.x1, xbA.x2), (xbB.x1, xbB.x2));
// //     let occupyY = occupyFatly((xbA.y1, xbA.y2), (xbB.y1, xbB.y2));
// //     let occupyZ = occupyFatly((xbA.z1, xbA.z2), (xbB.z1, xbB.z2));

// //     occupyX && occupyY && occupyZ
// // }

// /// This is a lower requirement than xbOccupy. All xbOccupy satisfies this as
// /// well.
// // function faceOccupy(cellSize: number, xbA: Xb, xbB: Xb): boolean {
// //     let  {
// //         x1,
// //         x2,
// //         y1,
// //         y2,
// //         z1,
// //         z2,
// //     } = xbB;
// //     let xSame = x1 === x2;
// //     let ySame = y1 === y2;
// //     let zSame = z1 === z2;
// //     match (xSame, ySame, zSame) {
// //         (true, false, false) => faceOccupyX(cellSize, xbA, xbB),
// //         (false, true, false) => faceOccupyY(cellSize, xbA, xbB),
// //         (false, false, true) => faceOccupyZ(cellSize, xbA, xbB),
// //         _ =>  throw new Error("Not a face"),
// //     }
// // }

// // function faceOccupyX(cellSize: number, xbA: Xb, xbB: Xb): boolean {
// //     let occupyX = occupyThinly(
// //         (xbA.x1, xbA.x2),
// //         (xbB.x1 - (cellSize / 2.0), xbB.x2 + (cellSize / 2.0)),
// //     );
// //     let occupyY = occupyFatly((xbA.y1, xbA.y2), (xbB.y1, xbB.y2));
// //     let occupyZ = occupyFatly((xbA.z1, xbA.z2), (xbB.z1, xbB.z2));
// //    return occupyX && occupyY && occupyZ
// // }

// // function faceOccupyY(cellSize: number, xbA: Xb, xbB: Xb): boolean {
// //     let occupyX = occupyFatly((xbA.x1, xbA.x2), (xbB.x1, xbB.x2));
// //     let occupyY = occupyThinly(
// //         (xbA.y1, xbA.y2),
// //         (xbB.y1 - (cellSize / 2.0), xbB.y2 + (cellSize / 2.0)),
// //     );
// //     let occupyZ = occupyFatly((xbA.z1, xbA.z2), (xbB.z1, xbB.z2));
// //     return  occupyX && occupyY && occupyZ
// // }

// // function faceOccupyZ(cellSize: number, xbA: Xb, xbB: Xb): boolean {
// //     let occupyX = occupyFatly((xbA.x1, xbA.x2), (xbB.x1, xbB.x2));
// //     let occupyY = occupyFatly((xbA.y1, xbA.y2), (xbB.y1, xbB.y2));
// //     let occupyZ = occupyThinly(
// //         (xbA.z1, xbA.z2),
// //         (xbB.z1 - (cellSize / 2.0), xbB.z2 + (cellSize / 2.0)),
// //     );
// //    return  occupyX && occupyY && occupyZ
// // }

// // /// xbOccupy but along one dimension. Testing if the first occupies the second.
// // function occupyFatly([xMin, xMax]: [number, number], [xMinB, xMaxB]: [number, number]): boolean {
// //     let xMidB = (xMinB + xMaxB) / 2.0;
// //     return (xMin < xMidB) && (xMax >= xMidB)
// // }

// // /// xbOccupy but along one dimension. Testing if the first occupies the second.
// // function occupyThinly([xMin, xMax]: [number, number], [xMinB, xMaxB]: [number, number]): boolean {
// //     return  ((xMin >= xMinB) && (xMin <= xMaxB)) || ((xMax >= xMinB) && (xMax <= xMaxB))
// // }

// // function hasOpenSurf(fds_data:FdsFile, nml:  HasSurf): boolean {
// //     return  nml.getSurfList(fds_data)

// //         .any((surf)=> isOpenSurf(surf))
// // }

// function isOpenSurf(surf:Surf): boolean {
//     return   surf.id === "OPEN"
// }

// function getCellXB(
//     fds_data: FdsFile,
//     [meshNum, [i, j, k]]: [number, [number, number, number]],
// ): Xb | undefined {
//     let mesh = fds_data.meshes[meshNum];
//     if (!mesh) return;
//     let meshLines = getMeshLines(fds_data, meshNum, mesh);
//     if (!meshLines) return;
//     let [xs, ys, zs] = meshLines;
//     let x1 =  xs[i];
//     let x2 =  xs[i + 1];
//     let y1 =  ys[j];
//     let y2 =  ys[j + 1];
//     let z1 =  zs[k];
//     let z2 =  zs[k + 1];
//   return  {
//         x1,
//         x2,
//         y1,
//         y2,
//         z1,
//         z2,
//     }
// }

// function getMinDim(fds_data:FdsFile, cell: [number, [number, number, number]]):number | undefined  {
//     let xb = getCellXB(fds_data, cell);
//     if (!xb) return;
//     let Xb {
//         x1,
//         x2,
//         y1,
//         y2,
//         z1,
//         z2,
//     } = xb;
//     let delX = Math.abs(x2 - x1);
//     let delY = Math.abs(y2 - y1);
//     let delZ = Math.abs(z2 - z1);
//     return   fmin(delX, fmin(delY, delX))
// }

// /// Determine the cell in which a point lies. The output is (MeshNum, (I,J,K)).
// function determineCell(fds_data:FdsFile, point: Xyz): [number, [number, number, number]] | undefined {
//     let x = determineMesh(fds_data, point);
//     if (!x) return;
//     let [meshIndex, mesh ]= x
//     let cell = determineCellInMesh(fds_data, point, meshIndex, mesh);
//     if (!cell) return;
//     return   [meshIndex, cell]
// }

// /// Determine which mesh the point is in. Output is MeshNum. This assumes that
// /// there are no overlapping meshes.
// function determineMesh(fds_data:FdsFile, point: Xyz): [number, Mesh] | undefined   {
//     return   fds_data .meshes .enumerate() .find(([_,m])=> isInMesh(point, m))
// }

// function fmin(a: number, b: number): number {
//     if (a < b) {
//         return   a
//     } else {
//         return    b
//     }
// }

// function fmax(a: number, b: number): number {
//     if (a > b) {
//         return   a
//     } else {
//         return    b
//     }
// }

// function isInMesh(point: Xyz, mesh:Mesh): boolean {
//     if (!mesh.xb) return false;
//     let xmin = fmin(mesh.xb.x1, mesh.xb.x2);
//     let ymin = fmin(mesh.xb.y1, mesh.xb.y2);
//     let zmin = fmin(mesh.xb.z1, mesh.xb.z2);

//     let xmax = fmax(mesh.xb.x1, mesh.xb.x2);
//     let ymax = fmax(mesh.xb.y1, mesh.xb.y2);
//     let zmax = fmax(mesh.xb.z1, mesh.xb.z2);
//     return  [
//         (point.x >= xmin) && (point.x <= xmax),
//         (point.y >= ymin) && (point.y <= ymax),
//         (point.z >= zmin) && (point.z <= zmax),
//     ]

//     .all((s) => *s)
// }

// /// Determine in which cell within a mesh a point lies. Return Nothing if the
// /// point does not lie within the mesh.
// function determineCellInMesh(
//     fds_data:FdsFile,
//     point: Xyz,
//     meshIndex: number,
//     mesh:Mesh,
// ): [number, number, number] | undefined {
//     let meshLines = getMeshLines(fds_data, meshIndex, mesh);
//     if (!meshLines) return;
//     let [xs, ys, zs] = meshLines
//     let iCell = findPointInLine(xs, point.x);
//     if (!iCell) return;
//     let jCell = findPointInLine(ys, point.y);
//     if (!jCell) return;
//     let kCell = findPointInLine(zs, point.z);
//     if (!kCell) return;
//     return   [iCell, jCell, kCell]
// }

// // function findPointInLine(ps:[number], p: number):number | undefined  {
// //     let ns = ps.enumerate();
// //     // If p is less than the first value of x, it lies outside the mesh;
// //     if let Some((i, x)) = ns.next() {
// //         if p < x {
// //             return None;
// //         }
// //     }
// //     for (i, x) of ns {
// //         if p < x {
// //             return Some(i - 1);
// //         }
// //     }
// //     return   None
// // }

// /// Uniform meshes can be determined using simply the MESH namelist. For
// /// non-uniform meshes we need to use the TRN entries.
// // function getMeshLines (
// //     fds_data: FdsFile,
// //     meshIndex: number,
// //     mesh:  Mesh,
// // ): [number[],number[], number[]] |undefined {
// //     let ijk = mesh.ijk;

// //     let xmin = fmin(mesh.xb.x1, mesh.xb.x2);
// //     let ymin = fmin(mesh.xb.y1, mesh.xb.y2);
// //     let zmin = fmin(mesh.xb.z1, mesh.xb.z2);

// //     let xmax = fmax(mesh.xb.x1, mesh.xb.x2);
// //     let ymax = fmax(mesh.xb.y1, mesh.xb.y2);
// //     let zmax = fmax(mesh.xb.z1, mesh.xb.z2);

// //     let delX = (xmax - xmin) / (ijk.i );

// //     let delY = (ymax - ymin) / (ijk.j );
// //     let delZ = (zmax - zmin) / (ijk.k );

// //     // Get the relevant TRNs
// //     let trnx
// //      {
// //         let trns:  Trnx[]= fds_data .trnx .filter((trn) => trn.mesh_number === meshIndex  + 1) ;
// //         if (trns.len() > 1) {
// //              throw new Error(`multiple TRNS found for mesh ${meshIndex}`)
// //         } else {
// //             trnx =  trns.first().copied()
// //         }
// //     };
// //     let trny  {
// //         let trns: any[]= fds_data .trny .filter((trn) => trn.mesh_number === meshIndex  + 1) ;
// //         if (trns.len() > 1) {
// //               throw new Error("multiple TRNS found for mesh {}", meshIndex)
// //         } else {
// //             trny =  trns.first().copied()
// //         }
// //     };
// //     let trnz   {
// //         let trns: any[]= fds_data .trnz .filter((trn) => trn.mesh_number === meshIndex  + 1) ;
// //         if (trns.len() > 1) {
// //             throw new Error("multiple TRNS found for mesh {}", meshIndex)
// //         } else {
// //             trnz = trns.first().copied()
// //         }
// //     };

// //     let xs;
// //      if   (trnx) {
// //         // TODO actually implement TRNs
// //         xs = (0..ijk.i).map((n) => xmin + (n ) * delX)
// //     } else {
// //         xs = (0..ijk.i).map((n) => xmin + (n ) * delX)
// //     };
// //     let ys ;
// //     if ( trny) {
// //         // TODO actually implement TRNs
// //         ys = (0..ijk.j).map((n) => ymin + (n ) * delY)
// //     } else {
// //         ys = (0..ijk.j).map((n) => ymin + (n ) * delY)
// //     };
// //     let zs;
// //      if  ( trnz) {
// //         // TODO actually implement TRNs
// //         zs = (0..ijk.k).map((n) => zmin + (n ) * delZ)
// //     } else {
// //        zs = (0..ijk.k).map((n) => zmin + (n ) * delZ)
// //     };
// //     return [xs,ys,zs]
// // }
// /// Use the OBST namelists to determine if a particular cell is solid or not.
// /// TODO: only considers basic OBSTs and not MULT or the like.
// // function isCellSolid(fds_data:FdsFile, cell: [number, [number, number, number]]): boolean {
// //     let cellXB = getCellXB(fds_data, cell).unwrap();
// //     // -- If any obst overlaps with this cell, then it's solid
// //     let obsts =  fds_data.obst;
// //     return   fds_data.obst.any((obst)=> xbOccupy(obst.xb, cellXB))
// // }

function testResult(
  b: string,
): TestResult {
  return {
    message: b,
  };
}
/// Ensure that sprinklers and smoke detectors are beneath a ceiling.
function spkDetCeilingTest(fds_data: FdsFile): VerificationResult {
  const name = "Sprinklers and detectors immediately below ceiling";
  const nonBeneathCeiling: Devc[] = fds_data
    .devices
    .filter((devc) =>
      devcIsSprinkler(fds_data, devc) || devcIsSmokeDetector(fds_data, devc) ||
      devcIsThermalDetector(fds_data, devc)
    )
    .filter((devc) => !devcBeneathCeiling(devc));
  if (nonBeneathCeiling.length === 0) {
    return verificationResult(
      name,
      "success",
      testResult(
        "All sprinklers and detectors are immediately below the ceiling",
      ),
    );
  } else {
    const issues: VerificationResult[] = nonBeneathCeiling
      .map((devc) =>
        verificationResult(`Devc '${devc.id}' Location`, "failure", {
          message: `Not immediately beneath solid obstruction`,
        })
      );
    return verificationResult(
      "The following devices have issues with their location",
      worstCategoryArray(issues),
      issues,
    );
  }
}

function isFlowDevice(device: Devc): boolean {
  const firstQuantity = device.quantities[0];
  if (!firstQuantity) return false;
  return firstQuantity === "VOLUME FLOW" ||
    (firstQuantity === "NORMAL VELOCITY" &&
      device.spatial_statistic === "SURFACE INTEGRAL");
}

function dimensionsMatch(a: Xb, b: Xb): boolean {
  return a.x1 === b.x1 &&
    a.x2 === b.x2 &&
    a.y1 === b.y1 &&
    a.y2 === b.y2 &&
    a.z1 === b.z1 &&
    a.z2 === b.z2;
}

export function clearSuccessSummary(
  summary: VerificationSummary,
): VerificationSummary {
  return {
    result: summary.result ? clearSuccess(summary.result) : undefined,
  };
}

export function clearSuccess(
  { name, type, value }: VerificationResult,
): VerificationResult | undefined {
  let val;
  if (value instanceof Array) {
    const newV = [];
    for (const test of value) {
      const x = clearSuccess(test);
      if (x) newV.push(x);
    }
    if (newV.length === 0) return;
    val = newV;
  } else {
    if (type === "success") {
      return;
    }
    val = value;
  }
  return { name, type, value: val };
}

/// Take the xb dimensions of a vent and see if there is a flow vent with the
/// matching dimensions, or a device that references it as a duct node.
function hasFlowDevc(fds_data: FdsFile, vent: Vent): boolean {
  const flow_devcs = fds_data.devices.filter(isFlowDevice);
  // Find flow devices that match the vents XB
  const trackingFlowMatchingXB = flow_devcs.filter((devc) =>
    dimensionsMatch(vent.dimensions, devc.dimensions)
  );
  // TODO: fix hvac
  // // take only the devices which have a "DUCT_ID" parameter
  // let ductIDDevices: any[]= fds_datadevices.devicesdevices.filter((devc) => devc.duct_id.is_some())
  //     ;
  // // take only the devices where the "DUCT_ID" matches the flowing
  // // namelist
  // let relevantDuctIDDevices: any[]= ductIDDevices

  //     .filter((devc) => {
  //         if let (Some(duct_id), (Some(flow_id))) = (devc.duct_id, vent.id)
  //         {
  //           return  duct_id === flow_id
  //         } else {
  //             return   false
  //         }
  //     })
  //     ;
  // // take only the devices that measure "DUCT VOLUME FLOW", and check that
  // // the list is not null
  // let trackingFlowViaDuctID = relevantDuctIDDevices .any(|devc| devc.quantity === Some("DUCT VOLUME FLOW"));
  const trackingFlowViaDuctID = false;
  return trackingFlowMatchingXB.length > 0 || trackingFlowViaDuctID;
}

/// Test if two XBs intersect (i.e. their bounding boxes). Two bounding boxes
/// intersect of all 3 dimensions have overlap. EQ is considered overlap.
function intersect(a: Xb, b: Xb): boolean {
  const intersect_x = (a.x2 > b.x1) && (b.x2 > a.x1);
  const intersect_y = (a.y2 > b.y1) && (b.y2 > a.y1);
  const intersect_z = (a.z2 > b.z1) && (b.z2 > a.z1);
  return intersect_x && intersect_y && intersect_z;
}

/// Do any of the meshes overlap.
function meshes_overlap_test(fds_data: FdsFile): VerificationResult {
  // Clone a list of meshes.
  const intersections = [];
  for (const meshA of fds_data.meshes) {
    for (const meshB of fds_data.meshes) {
      if (intersect(meshA.dimensions, meshB.dimensions)) {
        intersections.push([meshA, meshB]);
      }
    }
  }
  if (intersections.length === 0) {
    return verificationResult("Mesh Intersections", "success", {
      message: "No Intersections",
    });
  } else {
    const res = [];
    for (const [meshA, meshB] of intersections) {
      res.push(verificationResult(
        "Mesh Intersections",
        "success",
        testResult(
          `Mesh ${meshA.id} intersects with ${meshB.id}`,
        ),
      ));
    }
    return verificationTree("Mesh Intersections", res);
  }
}

function parameters_test(fds_data: FdsFile): VerificationResult {
  const name = "Input Verification Tests";
  const tests = [
    // reac_tests,
    misc_tests, // , burnerTestsGroup
    dump_tests,
  ];
  const test_results = tests.map((test) => test(fds_data));
  return verificationTree(name, test_results);
}

function getSurface(fds_data: FdsFile, surfaceName: string): Surf | undefined {
  for (const surf of fds_data.surfaces) {
    if (surf.id === surfaceName) {
      return surf;
    }
  }
}

function flowTempTest(fds_data: FdsFile, vent: Vent): VerificationResult {
  if (!vent.surface) {
    return verificationResult(
      `Flow Temp vent ([${vent.index}]: ${vent.id})`,
      "success",
      {
        message: "Vent has no surface specified.",
      },
    );
  }
  const surface = vent.surface ? getSurface(fds_data, vent.surface) : undefined;
  if (!surface) {
    return verificationResult(name, "failure", {
      message: `Surface (${vent.surface}) could not be found`,
    });
  }
  if (surface.tmp_front == undefined) {
    return verificationResult(
      `Flow Temp for Surface (${vent.surface}) specified for vent ([${vent.index}]: ${vent.id})`,
      "success",
      {
        message: `Surface (${vent.surface}) leaves TMP_FRONT as default`,
      },
    );
  } else if (surface.tmp_front == 293.15) {
    return verificationResult(
      `Flow Temp for Surface (${vent.surface}) specified for vent ([${vent.index}]: ${vent.id})`,
      "success",
      {
        message: `Surface (${vent.surface}) leaves TMP_FRONT as default`,
      },
    );
  } else {
    return verificationResult(
      `Flow Temp for Surface (${vent.surface}) specified for vent ([${vent.index}]: ${vent.id})`,
      "failure",
      {
        message:
          `Surface (${vent.surface}) sets TMP_FRONT to ${surface.tmp_front}, which is not an expected value`,
      },
    );
  }
}

// Supplies should not have a temperature specified
function flowTemp(fds_data: FdsFile): VerificationResult {
  const name = "Flow Temperature Tests";
  const testResults = [];
  for (const mesh of fds_data.meshes) {
    for (const vent of mesh.vents ?? []) {
      testResults.push(flowTempTest(fds_data, vent));
    }
  }
  return verificationTree(name, testResults);
}

// /// Test that the REAC properties are reasonable.
// function reac_tests(fds_data:FdsFile):  VerificationResult {
//     let name = "REAC Properties";
//     function soot_yield_test(fds_data:FdsFile, reac:Reac):  VerificationResult {
//         let propName = "Soot Yield";
//         let testName = "Soot Yield";
//         let possibleValues =[0.07, 0.1];
//         if (reac.soot_yield) {
//             if (possibleValues.contains(reac.soot_yield)) {
//                 [testName,{type:"Success",message:`${propName} was ${value}, a recognised value.`},]
//             } else {
//                 return     verificationResult(
//                     testName,
//                      testResult("Failure",`{propName} was {value}, which is not one of the usual values of {possibleValues:?}.`),
//                  )
//             }
//         } else {
//             return   [testName,{type:"failure",message:"{propName} was not specified."},]
//         }
//     }

//         function co_yield_test(fds_data:FdsFile, reac:Reac):  VerificationResult {
//         let propName = "CO Yield";
//         let testName = "CO Yield";
//         let possibleValues =[0.05, 0.014];
//         if   (reac.co_yield) {
//             if (possibleValues.contains(reac.co_yield)) {
//                 [testName,{type:"Success",message:"{propName} was {value}, a recognised value."},]
//             } else {

//                 return       [testName,
//                      testResult("Failure",`{propName} was {value}, which is not one of the usual values of {possibleValues:?}.`),]

//             }
//         } else {
//             return    [testName,{type:"failure",message:"{propName} was not specified."},]
//         }
//     }
//     let tests  =  [
//         soot_yield_test,
//         co_yield_test, // --           , chemicalFormula
//     ];
//     let specified_result = specified(fds_data, "REAC", (f)=> !f.reac.is_empty());
//     let test_results =  [specified_result];
//     // TODO: deal with multiple REACs
//     if  (fds_data.reac.first()) {
//         for (test_result of tests.map((test) => test(fds_data, fds_data.reac.first()))) {
//             test_results.push(test_result);
//         }
//     }
//     return [name, test_results]
// }

/// Test that the MISC properties are reasonable.
function misc_tests(fds_data: FdsFile): VerificationResult {
  const name = "MISC Properties";

  function visibility_factor(fds_data: FdsFile): VerificationResult {
    const vis = fds_data.visibility_factor;
    let visibility_factor;
    if (!vis) {
      return verificationResult("Visibility Factor Set", "failure", {
        message: "Not Set",
      });
    } else {
      visibility_factor = vis;
    }

    if (visibility_factor === 3.0 || visibility_factor === 8.0) {
      return verificationResult(
        "Visibility Factor Value",
        "success",
        testResult(
          `Visibility Factor is ${visibility_factor}, a known value.`,
        ),
      );
    } else {
      return verificationResult(
        "Visibility Factor Value",
        "failure",
        testResult(
          `Visibility Factor is {visibility_factor}. Known good visibility factors are 3 and 8.`,
        ),
      );
    }
  }

  function maximum_visibility(fds_data: FdsFile): VerificationResult {
    const vis = fds_data.ec_ll && fds_data.visibility_factor
      ? fds_data.visibility_factor / fds_data.ec_ll
      : undefined;
    let maximum_visibility;
    if (!vis) {
      return verificationResult("Maximum Visibility Set", "failure", {
        message: "Not Set",
      });
    } else {
      maximum_visibility = vis;
    }

    if (maximum_visibility >= 100.0) {
      return verificationResult(
        "Maximum Visibility Value",
        "success",
        testResult(
          `Maximum Visibility is ${maximum_visibility} m, at least 100 m.`,
        ),
      );
    } else {
      return verificationResult(
        "Maximum Visibility Value",
        "failure",
        testResult(
          `Maximum Visibility is ${maximum_visibility}. This is a low value and may cause issues when try to visualise results.`,
        ),
      );
    }
  }
  const tests = [maximum_visibility, visibility_factor];
  const test_results = [];
  for (const test_result of tests.map((test) => test(fds_data))) {
    test_results.push(test_result);
  }
  return verificationTree(name, test_results);
}
/// Test that the DUMP properties are reasonable.
function dump_tests(fds_data: FdsFile): VerificationResult {
  const name = "DUMP Properties";
  // function dt_restart_test(fds_data:FdsFile):  VerificationResult {
  //         let name = "Restart Interval";
  //         if (fds_data.dump.dt_restart) {
  //             [name,{type:"Success",message:"Restart Interval is {ri}, any value is not set"},]
  //         } else {
  //             [name,{type:"success",message:"Restart Interval is not set"},]
  //         }
  //     }
  function nframes_test(fds_data: FdsFile): VerificationResult {
    const name = "Number of Frames";
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
        return verificationResult(
          name,
          "success",
          testResult(
            `Value ${fds_data.dump.nframes}, results in round number of frames`,
          ),
        );
      } else {
        return verificationResult(name, "failure", {
          message: "Value {nframes} may result in clipped output",
        });
      }
    } else {
      return verificationResult(name, "failure", {
        message: "NFRAMES not specified",
      });
    }
  }
  //       (summaryResults, testResults) = case (specified fdsData) of
  //         l@(Node (CompletedTest _ r@(Failure _)) _):  (r, [])
  //         l@(Node (CompletedTest _ (Success _)) _):
  //           let
  //               Just dump = fdsFile_Dump fdsData
  //               testResults :: [Tree CompletedTest]
  //               testResults = pam (pam tests dump) fdsData
  //               summaryResults :: TestResult
  //               summaryResults = worstN testResults
  //           in (summaryResults, testResults) :: (TestResult, [Tree CompletedTest])
  //   in Node (CompletedTest testName summaryResults) testResults
  const tests = [nframes_test /* dt_restart_test */];
  const test_results = [];
  if (fds_data.dump) {
    for (
      const test_result of tests.map((test) => test(fds_data))
    ) {
      test_results.push(test_result);
    }
  }
  return verificationTree(name, test_results);
}

type Burner = BurnerObst | BurnerVent;

export interface BurnerObst {
  type: "obst";
  object: Obst;
  fds_data: FdsFile;
}
export interface BurnerVent {
  type: "vent";
  object: Vent;
  fds_data: FdsFile;
}

export function fuel_area(burner: Burner): number {
  switch (burner.type) {
    case "obst":
      // TODO: currently just assumes zmax is being used
      return burner.object.fds_area.z;
    case "vent":
      return burner.object.fds_area;
  }
}

// TODO: assumes only zmax is being used
function burnerSurfId(burner: Burner): string | undefined {
  switch (burner.type) {
    case "obst":
      // TODO: currently just assumes zmax is being used
      return burner.object.surfaces?.z_max;
    case "vent":
      return burner.object.surface;
  }
}

export function max_hrr(burner: Burner): number {
  return fuel_area(burner) * hrrpua(burner);
}

export function hrrpua(burner: Burner): number {
  const surfId = burnerSurfId(burner);
  if (!surfId) return 0.0;
  const surface = burner.fds_data.surfaces.find((surface) =>
    surface.id === surfId
  );
  if (!surface) return 0.0;
  if (surface.hrrpua) {
    return surface.hrrpua;
  } else if (surface.mlrpua) {
    // MLRPUA is in kg/m^2/s, we simply need to multiply the mass loss
    // rate by the heat of combustion in kJ/kg.
    return burner.fds_data.reacs[0].heat_of_combustion * surface.mlrpua;
  } else {
    return 0.0;
  }
}

function isBurnerSurf(surf: Surf): boolean {
  return surf.mlrpua > 0 || surf.hrrpua > 0;
}

export function isBurnerObst(fds_data: FdsFile, obst: Obst): boolean {
  const surfaces = [];
  if (obst.surfaces) {
    surfaces.push(obst.surfaces.x_min);
    surfaces.push(obst.surfaces.x_max);
    surfaces.push(obst.surfaces.y_min);
    surfaces.push(obst.surfaces.y_max);
    surfaces.push(obst.surfaces.z_min);
    surfaces.push(obst.surfaces.z_max);
  }
  for (const surfaceName of surfaces) {
    const surface = fds_data.surfaces.find((surface) =>
      surface.id === surfaceName
    );
    if (!surface) continue;
    if (isBurnerSurf(surface)) {
      return true;
    }
  }
  return false;
}

function isBurnerVent(fds_data: FdsFile, vent: Vent): boolean {
  const surfaces = [];
  if (vent.surface) {
    surfaces.push(vent.surface);
  }
  for (const surfaceName of surfaces) {
    const surface = fds_data.surfaces.find((surface) =>
      surface.id === surfaceName
    );
    if (!surface) continue;
    if (isBurnerSurf(surface)) {
      return true;
    }
  }
  return false;
}

export function get_burners(fds_data: FdsFile): Burner[] {
  // Iterate through all the OBSTs and VENTs and determine which ones are
  // burners.
  const burners: Burner[] = [];
  for (const obst of fds_data.meshes.flatMap((mesh) => mesh.obsts ?? [])) {
    if (isBurnerObst(fds_data, obst)) {
      burners.push({ type: "obst", fds_data, object: obst });
    }
  }
  for (const vent of fds_data.meshes.flatMap((mesh) => mesh.vents ?? [])) {
    if (isBurnerVent(fds_data, vent)) {
      burners.push({ type: "vent", fds_data, object: vent });
    }
  }
  return burners;
}

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

// /// Test the growth rate of a burner and check that it either matches a standard
// /// growth rate, or a steady-state value within 20 s.
// function growth_rate_test(fds_data:FdsFile, burner:Burner):  VerificationResult {
//     // TODO: This requires understanding the burner and it's exposed surfaces
//     // TODO: allow steady state curves
//     let name = "Growth Rate";
//     let tau_qs: any[]= burner .panels .flat_map((panel)=> panel.tau_q()) ;
//     let tau_q
//     if (tau_qs.first()){
//         tau_q = tau_qs.first()
//     } else {
//         return [name,{type:"Warning",message:"No growth rate specified"},];
//     };
//     if (!tau_qs.all((x)=>  x === tau_q)) {
//         // If all TAU_Qs are no the same, test fails
//         return [name,{type:"failure",message:"Multiple different TAU_Q values"},];
//     }
//     let alpha = burner.max_hrr() / tau_q.abs()**2;

//     let std_growth_rates =  [
//         GrowthRate.NFPASlow,
//         GrowthRate.NFPAFast,
//         GrowthRate.NFPAMedium,
//         GrowthRate.NFPAUltrafast,
//         GrowthRate.EurocodeSlow,
//         GrowthRate.EurocodeMedium,
//         GrowthRate.EurocodeFast,
//         GrowthRate.EurocodeUltrafast,
//     ];

//     let std_growth_diffs: any[]= std_growth_rates

//         .map((std_alpha) => ((alpha - std_alpha.alpha()) / std_alpha.alpha()).abs())
//         ;
//     let min_diff = std_growth_diffs[0];
//     for (growth_diff of std_growth_diffs ){
//         if (growth_diff < min_diff) {
//             min_diff = growth_diff;
//         }
//     }
//     if (min_diff < 0.01) {
//         [name,{type:"success",message:"Alpha matches standard value"},]
//     } else {
//         [name,{type:"failure",message:"Alpha value deviates from standard values"},]
//     }
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

function verificationTree(
  a: string,
  b: VerificationResult[],
): VerificationResult {
  return { name: a, type: worstCategoryArray(b), value: b };
}

enum StdGrowthRate {
  NFPASlow,
  NFPAFast,
  NFPAMedium,
  NFPAUltrafast,
  EurocodeSlow,
  EurocodeMedium,
  EurocodeFast,
  EurocodeUltrafast,
  // Custom(number),
}

function alpha(growthRate: StdGrowthRate): number {
  switch (growthRate) {
    case StdGrowthRate.NFPASlow:
      return 1055.0 / 600 ** 2;
    case StdGrowthRate.NFPAFast:
      return 1055.0 / 300 ** 2;
    case StdGrowthRate.NFPAMedium:
      return 1055.0 / 150 ** 2;
    case StdGrowthRate.NFPAUltrafast:
      return 1055.0 / 75 ** 2;
    case StdGrowthRate.EurocodeSlow:
      return 1000.0 / 600 ** 2;
    case StdGrowthRate.EurocodeMedium:
      return 1000.0 / 300 ** 2;
    case StdGrowthRate.EurocodeFast:
      return 1000.0 / 150 ** 2;
    case StdGrowthRate.EurocodeUltrafast:
      return 1000.0 / 75 ** 2;
  }
}

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

export interface InputSummary {
  chid: string;
  simulation_length: number;
  n_burners: number;
  /** Peak HRR in Watts */
  total_max_hrr: number;
  heat_of_combustion_calc: number;
  heat_of_combustion: number;
  total_soot_production: number;
  n_sprinklers: number;
  sprinkler_activation_temperatures: number[];
  n_smoke_detectors: number;
  smoke_detector_obscurations: number[];
  n_extract_vents: number;
  total_extract_rate: number;
  n_supply_vents: number;
  total_supply_rate: number;
  n_meshes: number;
  n_cells: number;
  mesh_resolutions: Resolution[];
  // ndrs: number[][];
}

function flowRate(fds_data: FdsFile, vent: Vent): number | undefined {
  const surface = fds_data.surfaces.find((surface) =>
    surface.id === vent.surface
  );
  if (!surface) return;
  return surface.volume_flow;
}

function heat_of_combustion(fds_data: FdsFile): number {
  const reac = fds_data.reacs[0];
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
function soot_production_rate(fds_data: FdsFile): number {
  const reac = fds_data.reacs[0];
  const y_s = reac.soot_yield ?? 0.0;
  const hoc = heat_of_combustion(fds_data);
  const hrr = total_max_hrr(fds_data);
  return y_s / hoc * hrr;
}

function total_max_hrr(fds_data: FdsFile): number {
  const burners = get_burners(fds_data);
  return burners.map(max_hrr).reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0,
  );
}

export function summarise_input(fds_data: FdsFile): InputSummary {
  const simulation_length = fds_data.time.end - fds_data.time.begin;
  // let ndrs: Vec<Vec<_>> = burners.iter().map(|burner| burner.ndr()).collect();

  const supplies: Vent[] = [];
  let total_supply_rate = 0;
  const extracts: Vent[] = [];
  let total_extract_rate = 0;
  for (const vent of fds_data.meshes.flatMap((mesh) => mesh.vents ?? [])) {
    const flow = flowRate(fds_data, vent);
    if (flow != undefined) {
      if (flow < 0) {
        supplies.push(vent);
        total_supply_rate += flow;
      } else if (flow > 0) {
        extracts.push(vent);
        total_extract_rate += flow;
      }
    }
  }

  const sprinklers = fds_data.devices.filter((devc) =>
    devcIsSprinkler(fds_data, devc)
  );
  const n_sprinklers = sprinklers.length;

  const sprinkler_activation_temperatures: number[] = [];
  for (const devc of sprinklers) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (prop) {
      sprinkler_activation_temperatures.push(prop.activation_temperature);
    }
  }
  // smoke_detector_obscurations.dedup();
  sprinkler_activation_temperatures.sort();

  const smoke_detectors = fds_data.devices.filter((devc) =>
    devcIsSmokeDetector(fds_data, devc)
  );
  const n_smoke_detectors = smoke_detectors.length;
  const smoke_detector_obscurations: number[] = [];
  for (const devc of smoke_detectors) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (prop) {
      smoke_detector_obscurations.push(prop.activation_obscuration);
    }
  }
  // smoke_detector_obscurations.dedup();
  smoke_detector_obscurations.sort();

  return {
    chid: fds_data.chid,
    simulation_length,
    n_burners: get_burners(fds_data).length,
    total_max_hrr: total_max_hrr(fds_data),
    heat_of_combustion_calc: heat_of_combustion(fds_data),
    heat_of_combustion: fds_data.reacs[0]?.heat_of_combustion,
    total_soot_production: soot_production_rate(fds_data),
    n_sprinklers,
    sprinkler_activation_temperatures,
    n_smoke_detectors,
    smoke_detector_obscurations,
    n_extract_vents: extracts.length,
    total_extract_rate,
    n_supply_vents: supplies.length,
    total_supply_rate,
    n_meshes: fds_data.meshes.length,
    n_cells: countCells(fds_data),
    mesh_resolutions: fds_data.meshes.map((mesh) => mesh.cell_sizes),
    // ndrs,
  };
}

export function countCells(fds_data: FdsFile): number {
  return fds_data.meshes.reduce(
    (accumulator, mesh) => accumulator + (mesh.ijk.i * mesh.ijk.j * mesh.ijk.k),
    0,
  );
}
