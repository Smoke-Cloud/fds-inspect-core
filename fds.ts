import { DataVector } from "./smv.ts";

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

export interface XbMinMax {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  z_min: number;
  z_max: number;
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
export interface IMesh {
  index: number;
  id: string;
  ijk: {
    i: number;
    j: number;
    k: number;
  };
  dimensions: Xb;
  cell_sizes: Resolution;
  vents: IVent[];
  obsts: IObst[];
}

export class Mesh implements IMesh {
  public index: number;
  public id: string;
  public ijk: { i: number; j: number; k: number };
  public dimensions: Xb;
  public cell_sizes: Resolution;
  public vents: Vent[];
  public obsts: Obst[];
  constructor(public fdsData: FdsData, mesh: IMesh) {
    this.index = mesh.index;
    this.id = mesh.id;
    this.ijk = mesh.ijk;
    this.dimensions = mesh.dimensions;
    this.cell_sizes = mesh.cell_sizes;
    this.vents = (mesh.vents ?? []).map((vent) => new Vent(this.fdsData, vent));
    this.obsts = (mesh.obsts ?? []).map((obst) => new Obst(this.fdsData, obst));
  }
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
export interface IDevc {
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

export class Devc implements IDevc {
  public index: number;
  public id: string;
  public label: string;
  public spatial_statistic: string;
  public spec_id: string;
  public prop_id: string;
  public mesh: number;
  public setpoint: number;
  public dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  public location: Xyz;
  public quantities: string[];
  public points: DevcPoint[];
  constructor(public fdsData: FdsData, devc: IDevc) {
    this.index = devc.index;
    this.id = devc.id;
    this.label = devc.label;
    this.spatial_statistic = devc.spatial_statistic;
    this.spec_id = devc.spec_id;
    this.prop_id = devc.prop_id;
    this.mesh = devc.mesh;
    this.setpoint = devc.setpoint;
    this.dimensions = devc.dimensions;
    this.location = devc.location;
    this.quantities = devc.quantities;
    this.points = devc.points;
  }
  // TODO: check for flow
  public get isSprinkler(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isSprinkler;
    } else {
      return false;
    }
  }

  public get isThermalDetector(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isThermalDetector;
    } else {
      return false;
    }
  }
  public get isSmokeDetector(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isSmokeDetector;
    } else {
      return false;
    }
  }

  public get isFlowDevice(): boolean {
    const firstQuantity = this.quantities[0];
    if (!firstQuantity) return false;
    return firstQuantity === "VOLUME FLOW" ||
      (firstQuantity === "NORMAL VELOCITY" &&
        this.spatial_statistic === "SURFACE INTEGRAL");
  }

  /// Check if the cell directly above a device is solid. This is useful to make
  /// sure that sprinklers and smoke detectors are directly beneath the a ceiling.
  ///
  /// TODO: This is more complicated as it may not be a solid cell, but a solid
  /// surface. This is exacerbated by being on a mesh boundary.
  public get devcBeneathCeiling(): boolean {
    return this.points.every((point: DevcPoint) =>
      point.init_solid_zplus !== false
    );
  }
  /// Check if a device is stuck in a solid. Returns Nothing if it's not a
  /// sensible question (e.g. it is not a point device).
  public get stuckInSolid(): boolean {
    for (const point of this.points) {
      if (point.init_solid) {
        return true;
      }
    }
    return false;
  }
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
export interface ISurf {
  index: number;
  id: string;
  hrrpua: number;
  tmp_front?: number;
  tau_q: number;
  mlrpua: number;
  vel: number;
  volume_flow: number;
}

export class Surf implements ISurf {
  public index: number;
  public id: string;
  public hrrpua: number;
  public tmp_front?: number | undefined;
  public tau_q: number;
  public mlrpua: number;
  public vel: number;
  public volume_flow: number;
  constructor(public fdsData: FdsData, surf: ISurf) {
    this.index = surf.index;
    this.id = surf.id;
    this.hrrpua = surf.hrrpua;
    this.tmp_front = surf.tmp_front;
    this.tau_q = surf.tau_q;
    this.mlrpua = surf.mlrpua;
    this.vel = surf.vel;
    this.volume_flow = surf.volume_flow;
  }
  get isBurner(): boolean {
    return this.mlrpua > 0 || this.hrrpua > 0;
  }
  get hasFlow(): boolean {
    return this.vel != null ||
      this.volume_flow != null;
  }
}

/** Hvac node information */
export interface Hvac {
  vent_id: string;
  vent2_id: string;
}

/** Property information */
export interface IProp {
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

export class Prop implements IProp {
  public index: number;
  public id: string;
  public part_id: string;
  public spec_id: string;
  public quantity: string;
  public activation_temperature: number;
  public activation_obscuration: number;
  public flow_rate: number;
  public particle_velocity: number;
  constructor(public fdsData: FdsData, prop: IProp) {
    this.index = prop.index;
    this.id = prop.id;
    this.part_id = prop.part_id;
    this.spec_id = prop.spec_id;
    this.quantity = prop.quantity;
    this.activation_temperature = prop.activation_temperature;
    this.activation_obscuration = prop.activation_obscuration;
    this.flow_rate = prop.flow_rate;
    this.particle_velocity = prop.particle_velocity;
  }

  public get isThermalDetector(): boolean {
    return this.quantity === "LINK TEMPERATURE";
  }

  public get isSprinkler(): boolean {
    return this.quantity === "SPRINKLER LINK TEMPERATURE";
  }

  public get isSmokeDetector(): boolean {
    return this.quantity === "CHAMBER OBSCURATION";
  }
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
  meshes: IMesh[];
  devices: Devc[];
  hvac: Hvac[];
  props: IProp[];
  parts: Part[];
  reacs: Reac[];
}

/** Vent information */
export interface IVent {
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

export class Vent implements IVent {
  public index: number;
  public id: string;
  public surface: string;
  public devc_id: string;
  public ctrl_id: string;
  public dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  public fds_area: number;
  constructor(public fdsData: FdsData, vent: IVent) {
    this.index = vent.index;
    this.id = vent.id;
    this.surface = vent.surface;
    this.devc_id = vent.devc_id;
    this.ctrl_id = vent.ctrl_id;
    this.dimensions = vent.dimensions;
    this.fds_area = vent.fds_area;
  }
  public get isBurner(): boolean {
    const surfaces = [];
    if (this.surface) {
      surfaces.push(this.surface);
    }
    for (const surfaceName of surfaces) {
      const surface = this.fdsData.surfaces.find((surface) =>
        surface.id === surfaceName
      );
      if (!surface) continue;
      if (surface.isBurner) {
        return true;
      }
    }
    return false;
  }
}

/** Obstruction information */
export interface IObst {
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

export class Obst implements IObst {
  public index: number;
  public id: string;
  public surfaces?: {
    x_min: string;
    x_max: string;
    y_min: string;
    y_max: string;
    z_min: string;
    z_max: string;
  };
  public devc_id: string;
  public ctrl_id: string;
  public dimensions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
  };
  public bounds: IjkBounds;
  public fds_area: {
    x: number;
    y: number;
    z: number;
  };
  constructor(public fdsData: FdsData, obst: IObst) {
    this.index = obst.index;
    this.id = obst.id;
    this.surfaces = obst.surfaces;
    this.devc_id = obst.devc_id;
    this.ctrl_id = obst.ctrl_id;
    this.dimensions = obst.dimensions;
    this.bounds = obst.bounds;
    this.fds_area = obst.fds_area;
  }

  public get isBurner(): boolean {
    const surfaces = [];
    if (this.surfaces) {
      surfaces.push(this.surfaces.x_min);
      surfaces.push(this.surfaces.x_max);
      surfaces.push(this.surfaces.y_min);
      surfaces.push(this.surfaces.y_max);
      surfaces.push(this.surfaces.z_min);
      surfaces.push(this.surfaces.z_max);
    }
    for (const surfaceName of surfaces) {
      const surface = this.fdsData.surfaces.find((surface) =>
        surface.id === surfaceName
      );
      if (!surface) continue;
      if (surface.isBurner) {
        return true;
      }
    }
    return false;
  }
}

export class FdsData implements FdsFile {
  public chid: string;
  public ec_ll: number;
  public visibility_factor: number;
  public dump: { nframes: number };
  public time: { begin: number; end: number };
  public surfaces: Surf[];
  public meshes: Mesh[];
  public devices: Devc[];
  public hvac: Hvac[];
  public props: Prop[];
  public parts: Part[];
  public reacs: Reac[];
  constructor(fdsFile: FdsFile) {
    this.chid = fdsFile.chid;
    this.ec_ll = fdsFile.ec_ll;
    this.visibility_factor = fdsFile.visibility_factor;
    this.dump = fdsFile.dump;
    this.time = fdsFile.time;
    this.surfaces = (fdsFile.surfaces ?? []).map((surf) =>
      new Surf(this, surf)
    );
    this.meshes = (fdsFile.meshes ?? []).map((mesh) => new Mesh(this, mesh));
    this.devices = (fdsFile.devices ?? []).map((devc) => new Devc(this, devc));
    this.hvac = fdsFile.hvac;
    this.props = (fdsFile.props ?? []).map((prop) => new Prop(this, prop));
    this.parts = fdsFile.parts;
    this.reacs = fdsFile.reacs;
  }

  public get burners(): Burner[] {
    // Iterate through all the OBSTs and VENTs and determine which ones are
    // burners.
    const burners: Burner[] = [];
    for (const obst of this.meshes.flatMap((mesh) => mesh.obsts ?? [])) {
      if (obst.isBurner) {
        const burner = new Burner(
          this,
          { type: "obst", object: obst },
        );
        burners.push(burner);
      }
    }
    for (const vent of this.meshes.flatMap((mesh) => mesh.vents ?? [])) {
      if (vent.isBurner) {
        const burner = new Burner(
          this,
          { type: "vent", object: vent },
        );
        burners.push(burner);
      }
    }
    return burners;
  }

  public getSurface(
    surfaceName: string,
  ): Surf | undefined {
    for (const surf of this.surfaces) {
      if (surf.id === surfaceName) {
        return surf;
      }
    }
  }

  public ventHasFlow(vent: IVent): boolean {
    // TODO: reenable
    // const linkedHVACs = this.hvac.filter((hvac) =>
    //   isLinkedToVent(vent, hvac)
    // );
    // const isHVAC = linkedHVACs.length != 0;
    const isHVAC = false;
    const surfaceName = vent.surface;
    const surface = this.getSurface(surfaceName);
    if (!surface) return false;
    const hasSurfFlow = surface.hasFlow;
    return isHVAC || hasSurfFlow;
  }

  /// Take the xb dimensions of a vent and see if there is a flow vent with the
  /// matching dimensions, or a device that references it as a duct node.
  public hasFlowDevc(vent: IVent): boolean {
    const flow_devcs = this.devices.filter((devc) => devc.isFlowDevice);
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

  public get hrrSpec(): HrrSpec | undefined {
    const specs = this.burners.map((burner) => burner.hrrSpec);
    if (specs.length === 0) {
      return undefined;
    } else if (specs.length === 1) {
      return specs[0];
    } else {
      return { type: "composite" };
    }
  }
}

export class Burner {
  private object: BurnerObst | BurnerVent;
  constructor(
    public fdsData: FdsData,
    object: BurnerObst | BurnerVent,
  ) {
    this.object = object;
  }

  get fuelArea(): number {
    switch (this.object.type) {
      case "obst":
        // TODO: currently just assumes zmax is being used
        return this.object.object.fds_area.z;
      case "vent":
        return this.object.object.fds_area;
      default:
        throw new Error("invalid burner type");
    }
  }
  // TODO: assumes only zmax is being used
  get surfId(): string | undefined {
    switch (this.object.type) {
      case "obst":
        // TODO: currently just assumes zmax is being used
        return this.object.object.surfaces?.z_max;
      case "vent":
        return this.object.object.surface;
      default:
        throw new Error("invalid burner type");
    }
  }

  get surface(): Surf | undefined {
    switch (this.object.type) {
      case "obst": {
        const surfaces = this.object.object.surfaces;
        if (surfaces?.z_max) {
          return this.fdsData.getSurface(surfaces?.z_max);
        }
        return undefined;
      }
      case "vent":
        return this.fdsData.getSurface(this.object.object.surface);
      default:
        throw new Error("invalid burner type");
    }
  }
  get maxHrr(): number {
    return this.fuelArea * this.hrrpua;
  }
  get hrrpua(): number {
    const surfId = this.surfId;
    if (!surfId) return 0.0;
    const surface = this.fdsData.surfaces.find((surface) =>
      surface.id === surfId
    );
    if (!surface) return 0.0;
    if (surface.hrrpua) {
      return surface.hrrpua;
    } else if (surface.mlrpua) {
      // MLRPUA is in kg/m^2/s, we simply need to multiply the mass loss
      // rate by the heat of combustion in kJ/kg.
      return this.fdsData.reacs[0].heat_of_combustion * surface.mlrpua;
    } else {
      return 0.0;
    }
  }
  get hrrSpec(): HrrSpec | undefined {
    // TODO: This requires understanding the burner and it's exposed
    // surfaces
    const surface = this.surface;
    if (!surface) return undefined;
    const tau_q = surface?.tau_q;
    return {
      type: "simple",
      tau_q,
      peak: this.maxHrr,
    };
  }
}

export type HrrSpec = HrrSpecSimple | HrrSpecComposite;

export interface HrrSpecSimple {
  type: "simple";
  tau_q: number;
  peak: number;
}

export interface HrrSpecComposite {
  type: "composite";
}

// in Watts
export function calcHrr(hrrSpec: HrrSpecSimple, t: number): number {
  const specifiedAlpha = hrrSpec.peak / Math.abs(hrrSpec.tau_q) ** 2;
  return cappedCurve(specifiedAlpha, -hrrSpec.tau_q, t);
}

export function cappedCurve(alpha: number, capTime: number, t: number): number {
  if (t <= 0) {
    return 0;
  } else if (t <= capTime) {
    return alpha * t ** 2;
  } else {
    return alpha * capTime ** 2;
  }
}

export function calcHrrAlpha(alpha: number, t: number): number {
  if (t <= 0) {
    return 0;
  } else {
    return alpha * t ** 2;
  }
}

export function generateHrr(
  hrrSpec: HrrSpecSimple,
  base: DataVector,
  factor?: number,
): DataVector {
  const dv: DataVector = {
    x: { name: "Time", units: "s" },
    y: { name: "Realised HRR", units: "kW" },
    values: [],
  };
  for (const point of base.values) {
    let y = calcHrr(hrrSpec, point.x);
    if (factor != undefined) {
      y *= factor;
    }
    dv.values.push({ x: point.x, y });
  }
  return dv;
}

export function generateHrrRelDiff(
  hrrSpec: HrrSpecSimple,
  base: DataVector,
): DataVector {
  const dv: DataVector = {
    x: { name: "Time", units: "s" },
    y: { name: "Realised HRR", units: "kW" },
    values: [],
  };
  for (const point of base.values) {
    const prescribed = calcHrr(hrrSpec, point.x);
    const realised = point.y * 1000;
    const diff = (realised - prescribed) / prescribed;
    dv.values.push({ x: point.x, y: diff });
  }
  return dv;
}

export function findClosestGrowthRate(
  hrrSpec: HrrSpec,
): { growthRate: StdGrowthRate; diff: number } | undefined {
  if (hrrSpec.type === "composite") return undefined;
  const specifiedAlpha = hrrSpec.peak / 1000 / Math.abs(hrrSpec.tau_q) ** 2;
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
  for (const [growthRate, growth_diff] of std_growth_diffs) {
    if (growth_diff < min_diff) {
      min_diff = growth_diff;
      matchingGrowthRate = growthRate;
    }
  }
  if (matchingGrowthRate) {
    return { growthRate: matchingGrowthRate, diff: min_diff };
  }
}

export function findMatchingGrowthRate(
  hrrSpec: HrrSpec,
): StdGrowthRate | undefined {
  const match = findClosestGrowthRate(hrrSpec);
  if (match) {
    if (match.diff < 0.001) {
      return match.growthRate;
    }
  }
}

export interface BurnerObst {
  type: "obst";
  object: Obst;
}
export interface BurnerVent {
  type: "vent";
  object: IVent;
}

export function dimensionsMatch(a: Xb, b: Xb): boolean {
  return a.x1 === b.x1 &&
    a.x2 === b.x2 &&
    a.y1 === b.y1 &&
    a.y2 === b.y2 &&
    a.z1 === b.z1 &&
    a.z2 === b.z2;
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

export function _isLinkedToVent(vent: IVent, hvac: Hvac): boolean {
  if (vent.id) {
    return hvac.vent_id === vent.id || hvac.vent2_id === vent.id;
  } else {
    return false;
  }
}
