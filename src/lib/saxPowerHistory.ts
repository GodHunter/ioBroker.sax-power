export type SaxPowerHistoryPeriod =
| "today"
| "week"
| "month"
| "year"
| "total";

export interface SaxPowerEnergyRecord {
de_time?: string;
me_time?: string;
year?: number;

m2?: number | null;
m2N?: number | null;
m4?: number | null;
m5?: number | null;
m5N?: number | null;

total_m2?: number | null;
total_m2N?: number | null;
total_m4?: number | null;
total_m5?: number | null;
total_m5N?: number | null;
}

export type SaxPowerEnergyChartResponse =
Record<string, SaxPowerEnergyRecord[]>;

export interface SaxPowerEnergyValues {
chargedKwh: number;
dischargedKwh: number;
gridImportKwh: number;
gridExportKwh: number;
pvKwh: number;
}

export interface SaxPowerDeviceStatistics {
serialNumber: string;

today: SaxPowerEnergyValues;
week: SaxPowerEnergyValues;
month: SaxPowerEnergyValues;
year: SaxPowerEnergyValues;
total: SaxPowerEnergyValues;
}

export interface SaxPowerStatisticsResult {
devices: Record<
string,
SaxPowerDeviceStatistics
>;

total: {
today: SaxPowerEnergyValues;
week: SaxPowerEnergyValues;
month: SaxPowerEnergyValues;
year: SaxPowerEnergyValues;
total: SaxPowerEnergyValues;
};
}
