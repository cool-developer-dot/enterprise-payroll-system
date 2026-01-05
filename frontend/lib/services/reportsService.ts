export interface PayrollSummary {
  totalPayroll: number;
  employeeCount: number;
  averageSalary: number;
  period: string;
}

export interface AttendanceOverview {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateArrivals: number;
  attendanceRate: number;
}

export interface LeaveAnalytics {
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  leaveTypes: Array<{ type: string; count: number }>;
}

export interface DepartmentCost {
  department: string;
  employeeCount: number;
  totalCost: number;
  percentage: number;
}

export interface ReportData {
  payrollSummary: PayrollSummary;
  attendanceOverview: AttendanceOverview;
  leaveAnalytics: LeaveAnalytics;
  departmentCosts: DepartmentCost[];
}

const mockReportData: ReportData = {
  payrollSummary: {
    totalPayroll: 258000,
    employeeCount: 47,
    averageSalary: 5490,
    period: "December 2024",
  },
  attendanceOverview: {
    totalDays: 1410,
    presentDays: 1320,
    absentDays: 90,
    lateArrivals: 45,
    attendanceRate: 93.6,
  },
  leaveAnalytics: {
    totalLeaves: 120,
    approvedLeaves: 95,
    pendingLeaves: 15,
    rejectedLeaves: 10,
    leaveTypes: [
      { type: "Annual Leave", count: 45 },
      { type: "Sick Leave", count: 35 },
      { type: "Personal Leave", count: 25 },
      { type: "Other", count: 15 },
    ],
  },
  departmentCosts: [
    { department: "Engineering", employeeCount: 15, totalCost: 95000, percentage: 36.8 },
    { department: "Sales", employeeCount: 12, totalCost: 72000, percentage: 27.9 },
    { department: "Marketing", employeeCount: 8, totalCost: 42000, percentage: 16.3 },
    { department: "HR", employeeCount: 6, totalCost: 28000, percentage: 10.9 },
    { department: "Finance", employeeCount: 6, totalCost: 21000, percentage: 8.1 },
  ],
};

export const reportsService = {
  async getReportData(
    dateFrom: string,
    dateTo: string,
    department?: string
  ): Promise<ReportData> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ...mockReportData };
  },

  async exportPDF(reportType: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Exporting ${reportType} as PDF`);
  },

  async exportExcel(reportType: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Exporting ${reportType} as Excel`);
  },
};

