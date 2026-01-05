export type PayrollStatus = "draft" | "processing" | "completed";

export interface PayrollPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  employeeCount: number;
  totalAmount: number;
  status: PayrollStatus;
  department?: string;
}

export interface PayrollFilter {
  period?: string;
  department?: string;
  status?: PayrollStatus;
}

const mockPayrollPeriods: PayrollPeriod[] = [
  {
    id: "pay-001",
    periodStart: "2024-11-01",
    periodEnd: "2024-11-30",
    employeeCount: 45,
    totalAmount: 245000,
    status: "completed",
  },
  {
    id: "pay-002",
    periodStart: "2024-12-01",
    periodEnd: "2024-12-31",
    employeeCount: 47,
    totalAmount: 258000,
    status: "processing",
  },
  {
    id: "pay-003",
    periodStart: "2025-01-01",
    periodEnd: "2025-01-31",
    employeeCount: 48,
    totalAmount: 0,
    status: "draft",
  },
  {
    id: "pay-004",
    periodStart: "2024-10-01",
    periodEnd: "2024-10-31",
    employeeCount: 44,
    totalAmount: 238000,
    status: "completed",
  },
  {
    id: "pay-005",
    periodStart: "2024-09-01",
    periodEnd: "2024-09-30",
    employeeCount: 43,
    totalAmount: 232000,
    status: "completed",
  },
];

export const payrollService = {
  async getPayrollPeriods(
    filters: PayrollFilter
  ): Promise<PayrollPeriod[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let filtered = [...mockPayrollPeriods];
    if (filters.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }
    if (filters.department) {
      filtered = filtered.filter((p) => p.department === filters.department);
    }
    return filtered;
  },

  async getCurrentPeriod(): Promise<PayrollPeriod | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockPayrollPeriods.find((p) => p.status === "processing") || mockPayrollPeriods[0];
  },

  async getNextPayrollDate(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return "2025-02-01";
  },
};

