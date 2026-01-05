export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  timezone: string;
  workingDays: string[];
}

export interface PayrollSettings {
  salaryCycle: "monthly" | "bi-weekly";
  overtimeRules: {
    enabled: boolean;
    rate: number;
    threshold: number;
  };
  bonuses: Array<{
    id: string;
    name: string;
    type: "fixed" | "percentage";
    value: number;
    enabled: boolean;
  }>;
  deductions: Array<{
    id: string;
    name: string;
    type: "fixed" | "percentage";
    value: number;
    enabled: boolean;
  }>;
}

export interface AttendanceRules {
  dailyWorkingHours: number;
  lateArrivalThreshold: number;
  overtimeEligibility: {
    enabled: boolean;
    minimumHours: number;
  };
}

export interface LeavePolicy {
  id: string;
  type: "paid" | "unpaid" | "sick" | "annual";
  name: string;
  maxDays: number;
  accrualRate: number;
  carryForwardLimit: number;
  enabled: boolean;
}

export interface Settings {
  company: CompanySettings;
  payroll: PayrollSettings;
  attendance: AttendanceRules;
  leavePolicies: LeavePolicy[];
}

const defaultSettings: Settings = {
  company: {
    companyName: "Acme Corporation",
    timezone: "America/New_York",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  payroll: {
    salaryCycle: "monthly",
    overtimeRules: {
      enabled: true,
      rate: 1.5,
      threshold: 40,
    },
    bonuses: [
      { id: "bonus-1", name: "Performance Bonus", type: "percentage", value: 10, enabled: true },
      { id: "bonus-2", name: "Annual Bonus", type: "fixed", value: 5000, enabled: true },
    ],
    deductions: [
      { id: "ded-1", name: "Health Insurance", type: "fixed", value: 200, enabled: true },
      { id: "ded-2", name: "Retirement Contribution", type: "percentage", value: 5, enabled: true },
    ],
  },
  attendance: {
    dailyWorkingHours: 8,
    lateArrivalThreshold: 15,
    overtimeEligibility: {
      enabled: true,
      minimumHours: 40,
    },
  },
  leavePolicies: [
    {
      id: "leave-1",
      type: "paid",
      name: "Paid Leave",
      maxDays: 20,
      accrualRate: 1.67,
      carryForwardLimit: 5,
      enabled: true,
    },
    {
      id: "leave-2",
      type: "unpaid",
      name: "Unpaid Leave",
      maxDays: 30,
      accrualRate: 0,
      carryForwardLimit: 0,
      enabled: true,
    },
    {
      id: "leave-3",
      type: "sick",
      name: "Sick Leave",
      maxDays: 10,
      accrualRate: 0.83,
      carryForwardLimit: 3,
      enabled: true,
    },
    {
      id: "leave-4",
      type: "annual",
      name: "Annual Leave",
      maxDays: 15,
      accrualRate: 1.25,
      carryForwardLimit: 7,
      enabled: true,
    },
  ],
};

let currentSettings: Settings = { ...defaultSettings };

export const settingsService = {
  async getSettings(): Promise<Settings> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ...currentSettings };
  },

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentSettings.company = { ...currentSettings.company, ...settings };
  },

  async updatePayrollSettings(settings: Partial<PayrollSettings>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentSettings.payroll = { ...currentSettings.payroll, ...settings };
  },

  async updateAttendanceRules(rules: Partial<AttendanceRules>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentSettings.attendance = { ...currentSettings.attendance, ...rules };
  },

  async updateLeavePolicies(policies: LeavePolicy[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentSettings.leavePolicies = policies;
  },

  getTimezones(): string[] {
    return [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
      "UTC",
      "Europe/London",
      "Europe/Paris",
      "Asia/Dubai",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
  },
};

