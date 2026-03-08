/** Real 3d location */
export interface IXyz {
  x: number;
  y: number;
  z: number;
}

/** Real 3d rectilinear bounds */
export interface IXb {
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
  dimensions: IXb;
  cell_sizes: Resolution;
  vents: IVent[];
  obsts: IObst[];
}

/** Reaction information */
export interface IReac {
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
  location: IXyz;
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
export interface ISurf {
  index: number;
  id: string;
  hrrpua: number;
  tmp_front?: number;
  tau_q: number;
  mlrpua: number;
  vel: number;
  volume_flow: number;
  layers: ISurfLayer[];
}

export interface ISurfLayer {
  index: number;
  density: number;
  thickness: number;
  materials: ILayerMaterial[];
}

export interface ILayerMaterial {
  index: number;
  id: string;
  mass_fraction: number;
  material_index: number;
}

export interface IMaterial {
  index: number;
  id: string;
  rho_s: number;
  emissivity: number;
  thermal_diffusivity: number;
}

/** Hvac node information */
export interface IHvac {
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

/** Particle class information */
export interface IPart {
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
    plot3d_quantity: string[];
    dt_pl3d: number;
  };
  time: {
    begin: number;
    end: number;
  };
  materials: IMaterial[];
  surfaces: ISurf[];
  meshes: IMesh[];
  devices: IDevc[];
  hvac: IHvac[];
  props: IProp[];
  parts: IPart[];
  reacs: IReac[];
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
