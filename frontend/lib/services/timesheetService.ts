export interface TimeSheet {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  overtime: number;
  status: "pending" | "approved" | "rejected";
  comments?: string;
}

export interface TimeSheetFilters {
  employeeName?: string;
  department?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "pending" | "approved" | "rejected" | "";
}

export interface TimeSheetSort {
  field: keyof TimeSheet;
  direction: "asc" | "desc";
}

// Mock data generator
const generateMockTimeSheets = (): TimeSheet[] => {
  const employees = [
    { name: "John Smith", role: "Software Engineer", department: "Engineering" },
    { name: "Sarah Johnson", role: "Product Manager", department: "Product" },
    { name: "Michael Chen", role: "Designer", department: "Design" },
    { name: "Emily Davis", role: "Marketing Specialist", department: "Marketing" },
    { name: "David Wilson", role: "Sales Representative", department: "Sales" },
    { name: "Lisa Anderson", role: "HR Manager", department: "HR" },
    { name: "Robert Taylor", role: "QA Engineer", department: "Engineering" },
    { name: "Jennifer Brown", role: "Accountant", department: "Finance" },
    { name: "James Martinez", role: "DevOps Engineer", department: "Engineering" },
    { name: "Patricia Garcia", role: "Business Analyst", department: "Operations" },
  ];

  const statuses: ("pending" | "approved" | "rejected")[] = ["pending", "approved", "rejected"];
  const timesheets: TimeSheet[] = [];

  for (let i = 0; i < 50; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const clockIn = `0${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}`;
    const clockOut = `1${7 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}`;
    const totalHours = 8 + Math.random() * 2;
    const overtime = totalHours > 8 ? totalHours - 8 : 0;

    timesheets.push({
      id: `ts-${i + 1}`,
      employeeId: `emp-${i + 1}`,
      employeeName: employee.name,
      role: employee.role,
      department: employee.department,
      date: date.toISOString().split("T")[0],
      clockIn,
      clockOut,
      totalHours: Math.round(totalHours * 10) / 10,
      overtime: Math.round(overtime * 10) / 10,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      comments: Math.random() > 0.7 ? "Late arrival due to traffic" : undefined,
    });
  }

  return timesheets;
};

let mockTimeSheets: TimeSheet[] = generateMockTimeSheets();

export const timesheetService = {
  async getTimeSheets(
    filters: TimeSheetFilters = {},
    sort: TimeSheetSort = { field: "date", direction: "desc" },
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ data: TimeSheet[]; total: number; page: number; pageSize: number }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = [...mockTimeSheets];

    if (filters.employeeName) {
      filtered = filtered.filter((ts) =>
        ts.employeeName.toLowerCase().includes(filters.employeeName!.toLowerCase())
      );
    }

    if (filters.department) {
      filtered = filtered.filter((ts) => ts.department === filters.department);
    }

    if (filters.role) {
      filtered = filtered.filter((ts) => ts.role === filters.role);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((ts) => ts.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((ts) => ts.date <= filters.dateTo!);
    }

    if (filters.status) {
      filtered = filtered.filter((ts) => ts.status === filters.status);
    }

    filtered.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sort.direction === "asc" ? -1 : 1;
      if (bVal == null) return sort.direction === "asc" ? 1 : -1;
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);

    return { data, total, page, pageSize };
  },

  async approveTimeSheet(id: string, comment?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const timesheet = mockTimeSheets.find((ts) => ts.id === id);
    if (timesheet) {
      timesheet.status = "approved";
      if (comment) timesheet.comments = comment;
    }
  },

  async rejectTimeSheet(id: string, comment: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const timesheet = mockTimeSheets.find((ts) => ts.id === id);
    if (timesheet) {
      timesheet.status = "rejected";
      timesheet.comments = comment;
    }
  },

  async bulkApprove(ids: string[], comment?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    ids.forEach((id) => {
      const timesheet = mockTimeSheets.find((ts) => ts.id === id);
      if (timesheet) {
        timesheet.status = "approved";
        if (comment) timesheet.comments = comment;
      }
    });
  },

  async bulkReject(ids: string[], comment: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    ids.forEach((id) => {
      const timesheet = mockTimeSheets.find((ts) => ts.id === id);
      if (timesheet) {
        timesheet.status = "rejected";
        timesheet.comments = comment;
      }
    });
  },

  getDepartments(): string[] {
    return Array.from(new Set(mockTimeSheets.map((ts) => ts.department))).sort();
  },

  getRoles(): string[] {
    return Array.from(new Set(mockTimeSheets.map((ts) => ts.role))).sort();
  },
};

