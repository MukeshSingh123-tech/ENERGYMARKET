type Nanogrid = {
  nanogrid_id: number | string;
  address?: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
};

type Snapshot = {
  timestamp: string;
  totalGeneration: number;
  totalLoad: number;
  avgBattery: number;
  batteryCharge: number;
  evCharge: number;
  gridExport: number;
  gridImport: number;
  nanogrids: Nanogrid[];
};

export function createEnergyFlowSnapshot(
  totalGeneration: number,
  totalLoad: number,
  avgBattery: number,
  batteryCharge: number,
  evCharge: number,
  gridExport: number,
  gridImport: number,
  nanogrids: Array<any>
): Snapshot {
  const now = new Date().toISOString();
  const normalizedNanogrids = (nanogrids || []).map((ng: any, i: number) => ({
    nanogrid_id: ng.nanogrid_id ?? ng.id ?? i,
    address: ng.address,
    solar_output: Number(ng.solar_output ?? 0),
    load_demand: Number(ng.load_demand ?? 0),
    battery_soc: Number(ng.battery_soc ?? 0),
  }));

  return {
    timestamp: now,
    totalGeneration,
    totalLoad,
    avgBattery,
    batteryCharge,
    evCharge,
    gridExport,
    gridImport,
    nanogrids: normalizedNanogrids,
  };
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportEnergyFlowToCSV(snapshots: Snapshot[], baseFilename = 'energy_history') {
  if (!snapshots || snapshots.length === 0) return;

  // Flatten: one row per snapshot per nanogrid
  const headers = [
    'snapshot_timestamp',
    'totalGeneration',
    'totalLoad',
    'avgBattery',
    'batteryCharge',
    'evCharge',
    'gridExport',
    'gridImport',
    'nanogrid_id',
    'nanogrid_address',
    'solar_output',
    'load_demand',
    'battery_soc',
  ];

  const rows: string[] = [];
  rows.push(headers.join(','));

  snapshots.forEach((s) => {
    (s.nanogrids || []).forEach((ng) => {
      const row = [
        s.timestamp,
        String(s.totalGeneration),
        String(s.totalLoad),
        String(s.avgBattery),
        String(s.batteryCharge),
        String(s.evCharge),
        String(s.gridExport),
        String(s.gridImport),
        String(ng.nanogrid_id),
        String(ng.address ?? ''),
        String(ng.solar_output),
        String(ng.load_demand),
        String(ng.battery_soc),
      ];
      rows.push(row.map((v) => `"${v.replace?.(/"/g, '""') ?? v}"`).join(','));
    });
  });

  const csv = rows.join('\n');
  const filename = `${baseFilename}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  downloadCSV(csv, filename);
}

export function exportDetailedEnergyReport(snapshot: Snapshot, nanogrids: Nanogrid[], baseFilename = 'energy_snapshot') {
  if (!snapshot) return;

  const headers = ['nanogrid_id', 'address', 'solar_output', 'load_demand', 'battery_soc'];
  const rows: string[] = [];
  rows.push(headers.join(','));

  (nanogrids || []).forEach((ng) => {
    const row = [String(ng.nanogrid_id), String(ng.address ?? ''), String(ng.solar_output), String(ng.load_demand), String(ng.battery_soc)];
    rows.push(row.map((v) => `"${v.replace?.(/"/g, '""') ?? v}"`).join(','));
  });

  // prepend snapshot summary as comment lines
  const summary = [
    `# snapshot_timestamp,${snapshot.timestamp}`,
    `# totalGeneration,${snapshot.totalGeneration}`,
    `# totalLoad,${snapshot.totalLoad}`,
    `# avgBattery,${snapshot.avgBattery}`,
    `# batteryCharge,${snapshot.batteryCharge}`,
    `# evCharge,${snapshot.evCharge}`,
    `# gridExport,${snapshot.gridExport}`,
    `# gridImport,${snapshot.gridImport}`,
  ].join('\n');

  const csv = `${summary}\n${rows.join('\n')}`;
  const filename = `${baseFilename}_${snapshot.timestamp.replace(/[:.]/g, '-')}.csv`;
  downloadCSV(csv, filename);
}

export default { createEnergyFlowSnapshot, exportEnergyFlowToCSV, exportDetailedEnergyReport };
