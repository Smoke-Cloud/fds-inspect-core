/** Real 3d location */
export interface Xyz {
  x: number;
  y: number;
  z: number;
}

/** Real 3d rectilinear bounds */
export interface Xb {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  z1: number;
  z2: number;
}

/** Integer 3d rectilinear bounds */
export interface IjkBounds {
  i_min: number;
  i_max: number;
  j_min: number;
  j_max: number;
  k_min: number;
  k_max: number;
}

/** Mesh information */
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

/** Reaction information */
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

/** Mesh resolution */
export interface Resolution {
  dx: number;
  dy: number;
  dz: number;
}

/** Device information */
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

/** A point location for a device with some additional properties of the
 * surrounding cells. */
export interface DevcPoint {
  i: number;
  j: number;
  k: number;
  init_solid: boolean;
  init_solid_zplus?: boolean;
}

/** Surface information */
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

/** Hvac node information */
export interface Hvac {
  vent_id: string;
  vent2_id: string;
}

/** Property information */
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

/** Particle class information */
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

/** Root FDS file object */
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

/** Vent information */
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

/** Obstruction information */
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
  bounds: IjkBounds;
  fds_area: {
    x: number;
    y: number;
    z: number;
  };
}

export type Burner = BurnerObst | BurnerVent;

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

export function getBurnerSurf(
  fds_data: FdsFile,
  burner: Burner,
): Surf | undefined {
  switch (burner.type) {
    case "obst":
      {
        const surfaces = burner.object.surfaces;
        if (surfaces?.z_max) {
          return getSurface(fds_data, surfaces?.z_max);
        }
      }
      break;
    case "vent":
      return getSurface(fds_data, burner.object.surface);
    default:
      break;
  }
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
export function burnerSurfId(burner: Burner): string | undefined {
  switch (burner.type) {
    case "obst":
      // TODO: currently just assumes zmax is being used
      return burner.object.surfaces?.z_max;
    case "vent":
      return burner.object.surface;
  }
}

export function max_hrr(burner: Burner): number {
  return fuel_area(burner) * hrrpua(burner) / 1000;
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

export function isBurnerSurf(surf: Surf): boolean {
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

export function isBurnerVent(fds_data: FdsFile, vent: Vent): boolean {
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

export function getSurface(
  fds_data: FdsFile,
  surfaceName: string,
): Surf | undefined {
  for (const surf of fds_data.surfaces) {
    if (surf.id === surfaceName) {
      return surf;
    }
  }
}

export function isFlowDevice(device: Devc): boolean {
  const firstQuantity = device.quantities[0];
  if (!firstQuantity) return false;
  return firstQuantity === "VOLUME FLOW" ||
    (firstQuantity === "NORMAL VELOCITY" &&
      device.spatial_statistic === "SURFACE INTEGRAL");
}

export function dimensionsMatch(a: Xb, b: Xb): boolean {
  return a.x1 === b.x1 &&
    a.x2 === b.x2 &&
    a.y1 === b.y1 &&
    a.y2 === b.y2 &&
    a.z1 === b.z1 &&
    a.z2 === b.z2;
}

// TODO: check for flow
export function devcIsSprinkler(fds_data: FdsFile, devc: Devc): boolean {
  if (devc.prop_id) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (!prop) return false;
    return isSprinklerProp(prop);
  } else {
    return false;
  }
}

export function devcIsThermalDetector(fds_data: FdsFile, devc: Devc): boolean {
  if (devc.prop_id) {
    const prop = fds_data.props.find((prop) => prop.id === devc.prop_id);
    if (!prop) return false;
    return isThermalDetectorProp(prop);
  } else {
    return false;
  }
}

export function isThermalDetectorProp(prop: Prop): boolean {
  return prop.quantity === "LINK TEMPERATURE";
}

export function isSprinklerProp(prop: Prop): boolean {
  return prop.quantity === "SPRINKLER LINK TEMPERATURE";
}

export function isSmokeDetectorProp(prop: Prop): boolean {
  return prop.quantity === "CHAMBER OBSCURATION";
}

export function devcIsSmokeDetector(fds_data: FdsFile, devc: Devc): boolean {
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
export function devcBeneathCeiling(devc: Devc): boolean {
  return devc.points.every(pointBeneathCeiling);
}

function pointBeneathCeiling(point: DevcPoint): boolean {
  return point.init_solid_zplus !== false;
}

export enum StdGrowthRate {
  NFPASlow = "nfpa-slow",
  NFPAMedium = "nfpa-medium",
  NFPAFast = "nfpa-fast",
  NFPAUltrafast = "nfpa-ultrafast",
  EurocodeSlow = "slow",
  EurocodeMedium = "medium",
  EurocodeFast = "fast",
  EurocodeUltrafast = "ultrafast",
  // Custom(number),
}

export function alpha(growthRate: StdGrowthRate): number {
  switch (growthRate) {
    case StdGrowthRate.NFPASlow:
      return 1055.0 / 600 ** 2;
    case StdGrowthRate.NFPAMedium:
      return 1055.0 / 300 ** 2;
    case StdGrowthRate.NFPAFast:
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

/// Test if two XBs intersect (i.e. their bounding boxes). Two bounding boxes
/// intersect of all 3 dimensions have overlap. EQ is considered overlap.
export function intersect(a: Xb, b: Xb): boolean {
  const intersect_x = (a.x2 > b.x1) && (b.x2 > a.x1);
  const intersect_y = (a.y2 > b.y1) && (b.y2 > a.y1);
  const intersect_z = (a.z2 > b.z1) && (b.z2 > a.z1);
  return intersect_x && intersect_y && intersect_z;
}

/// Take the xb dimensions of a vent and see if there is a flow vent with the
/// matching dimensions, or a device that references it as a duct node.
export function hasFlowDevc(fds_data: FdsFile, vent: Vent): boolean {
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

export function surfHasFlow(surf: Surf): boolean {
  return surf.mlrpua != null ||
    surf.hrrpua != null ||
    surf.vel != null ||
    surf.volume_flow != null;
}

export function getSurf(
  fds_data: FdsFile,
  surfaceName: string,
): Surf | undefined {
  for (const surf of fds_data.surfaces) {
    if (surf.id === surfaceName) {
      return surf;
    }
  }
}

export function ventHasFlow(fds_data: FdsFile, vent: Vent): boolean {
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
export function stuckInSolid(devc: Devc): boolean {
  for (const point of devc.points) {
    if (point.init_solid) {
      return true;
    }
  }
  return false;
}

export function _isLinkedToVent(vent: Vent, hvac: Hvac): boolean {
  if (vent.id) {
    return hvac.vent_id === vent.id || hvac.vent2_id === vent.id;
  } else {
    return false;
  }
}
