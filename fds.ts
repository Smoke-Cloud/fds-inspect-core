import type {
  DevcPoint,
  FdsFile,
  IDevc,
  IHvac,
  IjkBounds,
  ILayerMaterial,
  IMaterial,
  IMesh,
  IObst,
  IPart,
  IProp,
  IReac,
  ISurf,
  ISurfLayer,
  IVent,
  IXb,
  IXyz,
  Resolution,
} from "./fdsJson.ts";
import type { DataVector } from "./smv.ts";

export class FdsDataObject {
  public fdsData: FdsData;
  constructor(fdsData: FdsData) {
    this.fdsData = fdsData;
  }
}

export class Mesh extends FdsDataObject {
  public index: number;
  public id: string;
  public ijk: { i: number; j: number; k: number };
  public dimensions: Xb;
  public cell_sizes: Resolution;
  public vents: Vent[];
  public obsts: Obst[];
  constructor(fdsData: FdsData, mesh: IMesh) {
    super(fdsData);
    this.index = mesh.index;
    this.id = mesh.id;
    this.ijk = mesh.ijk;
    this.dimensions = new Xb(mesh.dimensions);
    this.cell_sizes = mesh.cell_sizes;
    this.vents = (mesh.vents ?? []).map((vent) => new Vent(this.fdsData, vent));
    this.obsts = (mesh.obsts ?? []).map((obst) => new Obst(this.fdsData, obst));
  }
  /** Get vents that have a proscribed flow associated with them (excluding burners). */
  public get flowVents(): Vent[] {
    return this.vents.filter((vent) => vent.hasFlow);
  }

  public meshArea(axis: "x" | "y" | "z"): number {
    switch (axis) {
      case "x":
        return this.meshAreaX();
      case "y":
        return this.meshAreaY();
      case "z":
        return this.meshAreaZ();
    }
  }

  public meshAreaX(): number {
    return (
      (this.dimensions.z2 - this.dimensions.z1) *
      (this.dimensions.y2 - this.dimensions.y1)
    );
  }

  public meshAreaY(): number {
    return (
      (this.dimensions.x2 - this.dimensions.x1) *
      (this.dimensions.z2 - this.dimensions.z1)
    );
  }

  public meshAreaZ(): number {
    return (
      (this.dimensions.x2 - this.dimensions.x1) *
      (this.dimensions.y2 - this.dimensions.y1)
    );
  }
}

export class Devc extends FdsDataObject {
  public index: number;
  public id: string;
  public label: string;
  public spatial_statistic: string;
  public spec_id: string;
  public prop_id: string;
  public meshIndex: number;
  public setpoint: number;
  public dimensions: Xb;
  public location: Xyz;
  public quantities: string[];
  public points: DevcPoint[];
  constructor(fdsData: FdsData, devc: IDevc) {
    super(fdsData);
    this.index = devc.index;
    this.id = devc.id;
    this.label = devc.label;
    this.spatial_statistic = devc.spatial_statistic;
    this.spec_id = devc.spec_id;
    this.prop_id = devc.prop_id;
    this.meshIndex = devc.mesh;
    this.setpoint = devc.setpoint;
    this.dimensions = new Xb(devc.dimensions);
    this.location = new Xyz(devc.location);
    this.quantities = devc.quantities;
    this.points = devc.points;
  }

  public get mesh(): Mesh {
    return this.fdsData.meshes[this.meshIndex];
  }

  // TODO: check for flow
  /** Is this device a sprinkler? */
  public get isSprinkler(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isSprinkler;
    } else {
      return false;
    }
  }

  /** Is this device a heat detector (this exlcudes sprinklers)? */
  public get isThermalDetector(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isThermalDetector;
    } else {
      return false;
    }
  }

  /** Is this device a smoke detector? */
  public get isSmokeDetector(): boolean {
    if (this.prop_id) {
      const prop = this.fdsData.props.find((prop) => prop.id === this.prop_id);
      if (!prop) return false;
      return prop.isSmokeDetector;
    } else {
      return false;
    }
  }

  /** Is this a flow-measuring device? */
  public get isFlowDevice(): boolean {
    const firstQuantity = this.quantities[0];
    if (!firstQuantity) return false;
    return (
      firstQuantity === "VOLUME FLOW" ||
      (firstQuantity === "NORMAL VELOCITY" &&
        this.spatial_statistic === "SURFACE INTEGRAL")
    );
  }

  /**
   * Check if the cell directly above a device is solid. This is useful to make
   * sure that sprinklers and smoke detectors are directly beneath the a ceiling.
   */
  // TODO: This is more complicated as it may not be a solid cell, but a solid
  // surface. This is exacerbated by being on a mesh boundary.
  public get devcBeneathCeiling(): boolean {
    return this.points.every(
      (point: DevcPoint) => point.init_solid_zplus !== false,
    );
  }

  /** Check if a device is stuck in a solid. */
  public get stuckInSolid(): boolean {
    for (const point of this.points) {
      if (point.init_solid) {
        return true;
      }
    }
    return false;
  }
}

export class Surf extends FdsDataObject {
  public index: number;
  public id: string;
  public hrrpua: number;
  public tmp_front?: number | undefined;
  public tau_q: number;
  public mlrpua: number;
  public vel: number;
  public volume_flow: number;
  public layers: SurfLayer[];
  constructor(fdsData: FdsData, surf: ISurf) {
    super(fdsData);
    this.index = surf.index;
    this.id = surf.id;
    this.hrrpua = surf.hrrpua;
    this.tmp_front = surf.tmp_front;
    this.tau_q = surf.tau_q;
    this.mlrpua = surf.mlrpua;
    this.vel = surf.vel;
    this.volume_flow = surf.volume_flow;
    this.layers = surf.layers.map((c) => new SurfLayer(fdsData, c));
  }

  /**
   * Does this surface have a specified HRR (e.g. via `MLRPUA` or `HRRPUA`)?
   */
  public get isBurner(): boolean {
    return this.mlrpua > 0 || this.hrrpua > 0;
  }

  /**
   * Does this surface have a flow specified (e.g. via `VOLUME_FLOW` or `VEL`)?
   */
  public get hasFlow(): boolean {
    return this.vel != null || this.volume_flow != null;
  }

  /**
   * Does this surface have a flow specified which supplies gas to the domain?
   */
  public get isSupply(): boolean {
    return this.vel < 0 || this.volume_flow < 0;
  }

  /**
   * Does this surface have a flow specified which extracts gas from the domain?
   */
  public get isExtract(): boolean {
    return this.vel > 0 || this.volume_flow > 0;
  }
}

export class SurfLayer extends FdsDataObject {
  public index: number;
  public density: number;
  public thickness: number;
  public materials: LayerMaterial[];
  constructor(fdsData: FdsData, surf: ISurfLayer) {
    super(fdsData);
    this.index = surf.index;
    this.density = surf.density;
    this.thickness = surf.thickness;
    this.materials = surf.materials.map((c) => new LayerMaterial(fdsData, c));
  }
}

export class LayerMaterial extends FdsDataObject {
  public index: number;
  public id: string;
  public mass_fraction: number;
  public material_index: number;
  constructor(fdsData: FdsData, surf: ILayerMaterial) {
    super(fdsData);
    this.index = surf.index;
    this.id = surf.id;
    this.mass_fraction = surf.mass_fraction;
    this.material_index = surf.material_index;
  }
}

export class Matl extends FdsDataObject {
  public index: number;
  public id: string;
  public rho_s: number;
  public emissivity: number;
  public thermal_diffusivity: number;
  constructor(fdsData: FdsData, surf: IMaterial) {
    super(fdsData);
    this.index = surf.index;
    this.id = surf.id;
    this.rho_s = surf.rho_s;
    this.emissivity = surf.emissivity;
    this.thermal_diffusivity = surf.thermal_diffusivity;
  }
}

export class Hvac extends FdsDataObject {
  public vent_id: string;
  public vent2_id: string;
  constructor(fdsData: FdsData, hvac: IHvac) {
    super(fdsData);
    this.vent_id = hvac.vent_id;
    this.vent2_id = hvac.vent2_id;
  }
}

export class Prop extends FdsDataObject {
  public index: number;
  public id: string;
  public part_id: string;
  public spec_id: string;
  public quantity: string;
  public activation_temperature: number;
  public activation_obscuration: number;
  public flow_rate: number;
  public particle_velocity: number;
  constructor(fdsData: FdsData, prop: IProp) {
    super(fdsData);
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

  /** Does this `PROP` defined a heat detector (this excludes sprinklers)? */
  public get isThermalDetector(): boolean {
    return this.quantity === "LINK TEMPERATURE";
  }

  /** Does this `PROP` defined a sprinkler? */
  public get isSprinkler(): boolean {
    return this.quantity === "SPRINKLER LINK TEMPERATURE";
  }

  /** Does this `PROP` defined a smoke detector? */
  public get isSmokeDetector(): boolean {
    return this.quantity === "CHAMBER OBSCURATION";
  }
}

export class Part extends FdsDataObject {
  public index: number;
  public id: string;
  public spec_id?: string;
  public devc_id?: string;
  public ctrl_id?: string;
  public surf_id?: string;
  public prop_id?: string;
  public diameter: string;
  public monodisperse: boolean;
  public age: number;
  public sampling_factor: number;
  constructor(fdsData: FdsData, part: IPart) {
    super(fdsData);
    this.index = part.index;
    this.id = part.id;
    this.spec_id = part.spec_id;
    this.devc_id = part.devc_id;
    this.ctrl_id = part.ctrl_id;
    this.surf_id = part.surf_id;
    this.prop_id = part.prop_id;
    this.diameter = part.diameter;
    this.monodisperse = part.monodisperse;
    this.age = part.age;
    this.sampling_factor = part.sampling_factor;
  }
}

export class Reac extends FdsDataObject {
  public c: number;
  public co_yield: number;
  public epumo2: number;
  public h: number;
  public heat_of_combustion: number;
  public n: number;
  public o: number;
  public soot_h_fraction?: number;
  public soot_yield: number;
  constructor(fdsData: FdsData, reac: IReac) {
    super(fdsData);
    this.c = reac.c;
    this.co_yield = reac.co_yield;
    this.epumo2 = reac.epumo2;
    this.h = reac.h;
    this.heat_of_combustion = reac.heat_of_combustion;
    this.n = reac.n;
    this.o = reac.o;
    this.soot_h_fraction = reac.soot_h_fraction;
    this.soot_yield = reac.soot_yield;
  }
}

export class Vent extends FdsDataObject {
  public index: number;
  public id: string;
  public surface: string;
  public devc_id: string;
  public ctrl_id: string;
  public dimensions: Xb;
  public fds_area: number;
  constructor(fdsData: FdsData, vent: IVent) {
    super(fdsData);
    this.index = vent.index;
    this.id = vent.id;
    this.surface = vent.surface;
    this.devc_id = vent.devc_id;
    this.ctrl_id = vent.ctrl_id;
    this.dimensions = new Xb(vent.dimensions);
    this.fds_area = vent.fds_area;
  }

  /**
   * Is this vent a burner?
   */
  public get isBurner(): boolean {
    const surfaces = [];
    if (this.surface) {
      surfaces.push(this.surface);
    }
    for (const surfaceName of surfaces) {
      const surface = this.fdsData.surfaces.find(
        (surface) => surface.id === surfaceName,
      );
      if (!surface) continue;
      if (surface.isBurner) {
        return true;
      }
    }
    return false;
  }

  /**
   * What (if any) is the surface applied to this vent?
   */
  public get surfaceDef(): Surf | undefined {
    return this.fdsData.surfaces.find((surface) => surface.id === this.surface);
  }

  /**
   * What is the flow rate of this vent?
   */
  public get flowRate(): number | undefined {
    const surface = this.surfaceDef;
    if (!surface) return undefined;
    // TODO: consider VEL as well
    return surface.volume_flow;
  }

  /**
   * Does this vent have a flow specified?
   */
  public get hasFlow(): boolean {
    const surface = this.surfaceDef;
    if (!surface) return false;
    return surface.hasFlow;
  }

  /**
   * Does this vent have a flow into the domain specified?
   */
  public get isSupply(): boolean {
    const surface = this.surfaceDef;
    if (!surface) return false;
    return surface.isSupply;
  }

  /**
   * Does this vent have a flow out of the domain specified?
   */
  public get isExtract(): boolean {
    const surface = this.surfaceDef;
    if (!surface) return false;
    return surface.isExtract;
  }
}

export class Obst extends FdsDataObject {
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
  public dimensions: Xb;
  public bounds: IjkBounds;
  public fds_area: {
    x: number;
    y: number;
    z: number;
  };
  constructor(fdsData: FdsData, obst: IObst) {
    super(fdsData);
    this.index = obst.index;
    this.id = obst.id;
    this.surfaces = obst.surfaces;
    this.devc_id = obst.devc_id;
    this.ctrl_id = obst.ctrl_id;
    this.dimensions = new Xb(obst.dimensions);
    this.bounds = obst.bounds;
    this.fds_area = obst.fds_area;
  }

  /** Is this a burner? */
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
      const surface = this.fdsData.surfaces.find(
        (surface) => surface.id === surfaceName,
      );
      if (!surface) continue;
      if (surface.isBurner) {
        return true;
      }
    }
    return false;
  }

  /** Does this have any inert surfaces? */
  public get hasInertSurface(): boolean {
    if (this.surfaces?.x_min === "INERT") return true;
    if (this.surfaces?.x_max === "INERT") return true;
    if (this.surfaces?.y_min === "INERT") return true;
    if (this.surfaces?.y_max === "INERT") return true;
    if (this.surfaces?.z_min === "INERT") return true;
    if (this.surfaces?.z_max === "INERT") return true;
    return false;
  }

  public obstArea(axis: "x" | "y" | "z"): number {
    switch (axis) {
      case "x":
        return this.fds_area.x;
      case "y":
        return this.fds_area.y;
      case "z":
        return this.fds_area.z;
    }
  }
}

export class FdsData {
  public chid: string;
  public ec_ll: number;
  public visibility_factor: number;
  public dump: { nframes: number; plot3d_quantity: string[]; dt_pl3d: number };
  public time: { begin: number; end: number };
  public materials: Matl[];
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
    this.materials = fdsFile.materials.map((c) => new Matl(this, c));
    this.surfaces = (fdsFile.surfaces ?? []).map(
      (surf) => new Surf(this, surf),
    );
    this.meshes = (fdsFile.meshes ?? []).map((mesh) => new Mesh(this, mesh));
    this.devices = (fdsFile.devices ?? []).map((devc) => new Devc(this, devc));
    this.hvac = (fdsFile.hvac ?? []).map((hvac) => new Hvac(this, hvac));
    this.props = (fdsFile.props ?? []).map((prop) => new Prop(this, prop));
    this.parts = (fdsFile.parts ?? []).map((part) => new Part(this, part));
    this.reacs = (fdsFile.reacs ?? []).map((reac) => new Reac(this, reac));
  }

  /**
   * A list of burners. Burners are defined as any geometry feature that has a defined HRR.
   */
  public get burners(): Burner[] {
    // Iterate through all the OBSTs and VENTs and determine which ones are
    // burners.
    const burners: Burner[] = [];
    // TODO: Sometimes a single burner occurs in two different meshes.
    for (const obst of this.meshes.flatMap((mesh) => mesh.obsts ?? [])) {
      if (obst.isBurner) {
        const burner = new Burner(this, { type: "obst", object: obst });
        burners.push(burner);
      }
    }
    for (const vent of this.meshes.flatMap((mesh) => mesh.vents ?? [])) {
      if (vent.isBurner) {
        const burner = new Burner(this, { type: "vent", object: vent });
        burners.push(burner);
      }
    }
    return burners;
  }

  private get uniqueVents() {
    const all: { vent: Vent; meshIndex: number }[] = this.meshes.flatMap(
      (mesh) => {
        const supplies = mesh.vents.map((vent) => ({
          vent,
          meshIndex: mesh.index,
        }));
        return supplies;
      },
    );
    const uniqueVents: Vent[] = [];
    // TODO: this is fairly inefficient.
    for (const { vent } of all) {
      let matchingVent;
      for (const existingVent of uniqueVents) {
        if (vent.id === existingVent.id) {
          if (vent.dimensions.dimensionsMatch(existingVent.dimensions)) {
            matchingVent = existingVent;
            break;
          }
        }
      }
      if (matchingVent) continue;
      uniqueVents.push(vent);
    }
    return uniqueVents;
  }

  /** Get supplies, deduplicating where they occur in multiple meshes */
  public get supplies(): Vent[] {
    return this.uniqueVents.filter((vent) => vent.isSupply);
  }

  /** Get extracts, deduplicating where they occur in multiple meshes */
  public get extracts(): Vent[] {
    return this.uniqueVents.filter((vent) => vent.isExtract);
  }

  /**
   * Given the `ID` of a surface return that surface.
   */
  public getSurface(surfaceName: string): Surf | undefined {
    for (const surf of this.surfaces) {
      if (surf.id === surfaceName) {
        return surf;
      }
    }
  }

  /**
   * Does the given vent have a flow specified across its surface (e.g., does
   * it have a surface with `VOLUME_FLOW` or `VEL` set)?
   */
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

  /**
   * Take the xb dimensions of a vent and see if there is a flow vent with the
   * matching dimensions, or a device that references it as a duct node.
   */
  public hasFlowDevc(vent: Vent): boolean {
    const flow_devcs = this.devices.filter((devc) => devc.isFlowDevice);
    // Find flow devices that match the vents XB
    const trackingFlowMatchingXB = flow_devcs.filter((devc) =>
      vent.dimensions.dimensionsMatch(devc.dimensions)
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

  /**
   * What is the defined HRR for this model (if there is one). This will return undefined if there is no HRR specified
   * or it relies on systems such as pyrolysis.
   */
  public get hrrSpec(): HrrSpec | undefined {
    const specs = this.burners.map((burner) => burner.hrrSpec);
    if (specs.length === 0) {
      return undefined;
    } else if (specs.length === 1) {
      return specs[0];
    } else {
      try {
        const defSpecs: HrrSpec[] = specs.filter(
          (x) => x !== undefined,
        ) as HrrSpec[];
        return addHrrSpecs(defSpecs);
      } catch {
        return { type: "composite" };
      }
    }
  }
}

/**
 * Combine multiple HRR specs into one. This will generally result in a
 * composite HRR spec.
 */
function addHrrSpecs(hrrSpecs: HrrSpec[]): HrrSpec {
  const accHrrSpec = hrrSpecs[0];
  if (accHrrSpec.type !== "simple") throw new Error("Cannot add complex HRRs");
  for (let i = 1; i < hrrSpecs.length; i++) {
    const hrrSpec = hrrSpecs[i];
    if (hrrSpec.type !== "simple") throw new Error("Cannot add complex HRRs");
    if (hrrSpec.tau_q !== accHrrSpec.tau_q) {
      throw new Error("Cannot add simple HRRs with different TAU_Q values");
    }
    accHrrSpec.peak += hrrSpec.peak;
  }
  return accHrrSpec;
}

// TODO: it is possible that a burner obst has multiple surfaces/areas contributing
// to it. We may need to reintroduce the concept of a burner panel.
/**
 * A Burner is an object within a model that has a specified HRR, generally an `OBST` or a `VENT`.
 */
export class Burner extends FdsDataObject {
  private object: BurnerObst | BurnerVent;
  constructor(fdsData: FdsData, object: BurnerObst | BurnerVent) {
    super(fdsData);
    this.object = object;
  }

  /**
   * The area of the burner.
   */
  public get fuelArea(): number {
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
  /** What `SURF` id is used for this burner. */
  public get surfId(): string | undefined {
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

  /** What is the surface of this burner? */
  public get surface(): Surf | undefined {
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

  /**
   * What is the peak HRR produced by this burner.
   */
  public get maxHrr(): number {
    return this.fuelArea * this.hrrpua;
  }

  /**
   * What is the peak HRRPUA of this burner?
   */
  public get hrrpua(): number {
    const surfId = this.surfId;
    if (!surfId) return 0.0;
    const surface = this.fdsData.surfaces.find(
      (surface) => surface.id === surfId,
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

  /**
   * What is the HRR specification of this burner?
   */
  public get hrrSpec(): HrrSpec | undefined {
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

/** Calculate the peak HRR (in Watts) of a given HRR specification. */
export function calcHrr(hrrSpec: HrrSpecSimple, t: number): number {
  const specifiedAlpha = hrrSpec.peak / Math.abs(hrrSpec.tau_q) ** 2;
  return cappedCurve(specifiedAlpha, -hrrSpec.tau_q, t);
}

function cappedCurve(alpha: number, capTime: number, t: number): number {
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

/** Given a HRR specification, generate a {@link DataVector} with that HRR. */
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

/** Given a HRR specification, generate a {@link DataVector} of the difference
 * between that HRR and base {@link DataVector}. */
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

function findClosestGrowthRate(
  hrrSpec: HrrSpec,
): { growthRate: StdGrowthRate; diff: number } | undefined {
  if (hrrSpec.type === "composite") return undefined;
  const specifiedAlpha = hrrSpec.peak / 1000 / Math.abs(hrrSpec.tau_q) ** 2;
  const std_growth_rates: StdGrowthRate[] = [
    "nfpa-slow",
    "nfpa-medium",
    "nfpa-fast",
    "nfpa-ultrafast",
    "slow",
    "medium",
    "fast",
    "ultrafast",
  ];

  const std_growth_diffs: [StdGrowthRate, number][] = std_growth_rates.map(
    (std_alpha) => [
      std_alpha,
      Math.abs((specifiedAlpha - alpha(std_alpha)) / alpha(std_alpha)),
    ],
  );
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

/**
 * Given a {@link HrrSpec} find the {@link StdGrowthRate} which most closely
 * matches it. */
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
  object: Vent;
}

export class Xyz {
  public x: number;
  public y: number;
  public z: number;
  constructor(xyz: IXyz) {
    this.x = xyz.x;
    this.y = xyz.y;
    this.z = xyz.z;
  }
}

export class Xb {
  public x1: number;
  public x2: number;
  public y1: number;
  public y2: number;
  public z1: number;
  public z2: number;
  constructor(xb: IXb) {
    this.x1 = xb.x1;
    this.x2 = xb.x2;
    this.y1 = xb.y1;
    this.y2 = xb.y2;
    this.z1 = xb.z1;
    this.z2 = xb.z2;
  }

  public dimensions(axis: "x" | "y" | "z"): { start: number; end: number } {
    switch (axis) {
      case "x":
        return { start: this.x1, end: this.x2 };
      case "y":
        return { start: this.y1, end: this.y2 };
      case "z":
        return { start: this.z1, end: this.z2 };
    }
  }

  /**
   * Given 2 {@link Xb}s, check if they are identical.
   */
  dimensionsMatch(b: Xb): boolean {
    return (
      this.x1 === b.x1 &&
      this.x2 === b.x2 &&
      this.y1 === b.y1 &&
      this.y2 === b.y2 &&
      this.z1 === b.z1 &&
      this.z2 === b.z2
    );
  }
}

/**
 * Standard growth rates defined in literature.
 */
export type StdGrowthRate =
  | "nfpa-slow"
  | "nfpa-medium"
  | "nfpa-fast"
  | "nfpa-ultrafast"
  | "slow"
  | "medium"
  | "fast"
  | "ultrafast";

/**
 * Given a growth rate, return the corresponding alpha value.
 */
export function alpha(growthRate: StdGrowthRate): number {
  switch (growthRate) {
    case "nfpa-slow":
      return 1055.0 / 600 ** 2;
    case "nfpa-medium":
      return 1055.0 / 300 ** 2;
    case "nfpa-fast":
      return 1055.0 / 150 ** 2;
    case "nfpa-ultrafast":
      return 1055.0 / 75 ** 2;
    case "slow":
      return 1000.0 / 600 ** 2;
    case "medium":
      return 1000.0 / 300 ** 2;
    case "fast":
      return 1000.0 / 150 ** 2;
    case "ultrafast":
      return 1000.0 / 75 ** 2;
  }
}

/**
 * Test if two XBs intersect (i.e. their bounding boxes). Two bounding boxes
 * intersect of all 3 dimensions have overlap.
 */
export function intersect(a: Xb, b: Xb): boolean {
  // This epsilon value is designed to account for Pyrosims adjustments around
  // zero.
  const epsilon = 1e-14;
  const intersect_x = a.x2 - b.x1 > epsilon && b.x2 - a.x1 > epsilon;
  const intersect_y = a.y2 - b.y1 > epsilon && b.y2 - a.y1 > epsilon;
  const intersect_z = a.z2 - b.z1 > epsilon && b.z2 - a.z1 > epsilon;
  return intersect_x && intersect_y && intersect_z;
}

export function _isLinkedToVent(vent: IVent, hvac: Hvac): boolean {
  if (vent.id) {
    return hvac.vent_id === vent.id || hvac.vent2_id === vent.id;
  } else {
    return false;
  }
}
