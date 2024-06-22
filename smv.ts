import type { Xyz } from "./fds.ts";
import type { IjkBounds, XbMinMax } from "./fds.ts";
import * as csv from "jsr:@std/csv@0.224.3";
import * as path from "jsr:@std/path@0.225.2";

export class SmvData implements ISmvData {
  public version: number;
  public chid: string;
  public input_file: string;
  public fds_version: string;
  public meshes: {
    index: number;
    id: string;
    coordinates: IjkBounds;
    dimensions: XbMinMax;
  }[];
  public csv_files: { index: number; filename: string; type: string }[];
  public devices: {
    index: number;
    id: string;
    csvlabel: string;
    label: string;
    quantity: string;
    position: Xyz;
    state_changes: { time: number; value: number }[];
  }[];
  public slices: {
    index: number;
    mesh: number;
    longlabel: string;
    shortlabel: string;
    unit: string;
    coordinates: IjkBounds;
  }[];
  public surfaces: [{ index: number; id: string }];
  constructor(public baseDir: string, smvData: ISmvData) {
    this.version = smvData.version;
    this.chid = smvData.chid;
    this.input_file = smvData.input_file;
    this.fds_version = smvData.fds_version;
    this.meshes = smvData.meshes;
    this.csv_files = smvData.csv_files;
    this.devices = smvData.devices;
    this.slices = smvData.slices;
    this.surfaces = smvData.surfaces;
  }
  public getCsvEntry(type: string) {
    for (const csvEntry of this.csv_files) {
      if (csvEntry.type === type) return csvEntry;
    }
  }
  public async getHrr(): Promise<DataVector | undefined> {
    // First see if we have a hrr csv file
    const csvEntry = this.getCsvEntry("hrr");
    if (!csvEntry) return;
    const csvFile = await Deno.readTextFile(
      path.join(this.baseDir, csvEntry.filename),
    );
    // We need to trim the first line as that is just the units.
    const csvDataTrimmed = csvFile.substring(csvFile.indexOf("\n") + 1);
    const csvData: Record<string, string | undefined>[] = csv.parse(
      csvDataTrimmed,
      { skipFirstRow: true },
    );
    const dVector: {
      x_name: string;
      y_name: string;
      values: { x: number; y: number }[];
    } = { x_name: "Time", y_name: "HRR", values: [] };
    for (const record of csvData) {
      const x = record["Time"] ? parseFloat(record["Time"]) : undefined;
      const y = record["HRR"] ? parseFloat(record["HRR"]) : undefined;
      if (x != undefined && y != undefined) {
        dVector.values.push({ x, y });
      }
    }
    return dVector;
  }
}

export interface DataVector {
  x_name: string;
  y_name: string;
  values: { x: number; y: number }[];
}

interface ISmvData {
  version: number;
  chid: string;
  input_file: string;
  fds_version: string;
  meshes: {
    index: number;
    id: string;
    coordinates: IjkBounds;
    dimensions: XbMinMax;
  }[];
  csv_files: {
    index: number;
    filename: string;
    type: string;
  }[];
  devices: {
    index: number;
    id: string;
    csvlabel: string;
    label: string;
    quantity: string;
    position: Xyz;
    state_changes: {
      time: number;
      value: number;
    }[];
  }[];
  slices: {
    index: number;
    mesh: number;
    longlabel: string;
    shortlabel: string;
    unit: string;
    coordinates: IjkBounds;
  }[];
  surfaces: [
    {
      index: number;
      id: string;
    },
  ];
}
