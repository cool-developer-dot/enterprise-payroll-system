export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment: string;
  employeeRole: string;
  leaveType: "paid" | "unpaid" | "sick" | "annual";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  comments?: string;
  leaveBalanceBefore: {
    paid: number;
    unpaid: number;
    sick: number;
    annual: number;
  };
  leaveBalanceAfter: {
    paid: number;
    unpaid: number;
    sick: number;
    annual: number;
  };
}

export interface LeaveFilters {
  employeeName?: string;
  department?: string;
  leaveType?: "paid" | "unpaid" | "sick" | "annual" | "";
  dateFrom?: string;
  dateTo?: string;
  status?: "pending" | "approved" | "rejected" | "";
}

export interface LeaveSort {
  field: keyof LeaveRequest;
  direction: "asc" | "desc";
}

const generateMockLeaveRequests = (): LeaveRequest[] => {
  const employees = [
    { name: "John Smith", email: "john.smith@company.com", department: "Engineering", role: "Software Engineer" },
    { name: "Sarah Johnson", email: "sarah.j@company.com", department: "Product", role: "Product Manager" },
    { name: "Michael Chen", email: "michael.chen@company.com", department: "Design", role: "UI Designer" },
    { name: "Emily Davis", email: "emily.davis@company.com", department: "Marketing", role: "Marketing Specialist" },
    { name: "David Wilson", email: "david.w@company.com", department: "Sales", role: "Sales Representative" },
    { name: "Lisa Anderson", email: "lisa.a@company.com", department: "HR", role: "HR Manager" },
    { name: "Robert Taylor", email: "robert.t@company.com", department: "Engineering", role: "QA Engineer" },
    { name: "Jennifer Brown", email: "jennifer.b@company.com", department: "Finance", role: "Accountant" },
    { name: "James Martinez", email: "james.m@company.com", department: "Engineering", role: "DevOps Engineer" },
    { name: "Patricia Garcia", email: "patricia.g@company.com", department: "Operations", role: "Business Analyst" },
  ];

  const leaveTypes: ("paid" | "unpaid" | "sick" | "annual")[] = ["paid", "unpaid", "sick", "annual"];
  const statuses: ("pending" | "approved" | "rejected")[] = ["pending", "approved", "rejected"];
  const reasons = [
    "Family vacation",
    "Medical appointment",
    "Personal emergency",
    "Family event",
    "Mental health day",
    "Medical treatment",
    "Holiday celebration",
    "Personal matters",
  ];

  const requests: LeaveRequest[] = [];

  for (let i = 0; i < 60; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 60));
    const days = Math.floor(Math.random() * 10) + 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    const submittedDate = new Date(startDate);
    submittedDate.setDate(submittedDate.getDate() - Math.floor(Math.random() * 30));

    const balanceBefore = {
      paid: 15 - Math.floor(Math.random() * 10),
      unpaid: 5,
      sick: 10 - Math.floor(Math.random() * 5),
      annual: 20 - Math.floor(Math.random() * 10),
    };

    const balanceAfter = { ...balanceBefore };
    if (leaveType === "paid") balanceAfter.paid -= days;
    if (leaveType === "annual") balanceAfter.annual -= days;
    if (leaveType === "sick") balanceAfter.sick -= days;

    requests.push({
      id: `leave-${i + 1}`,
      employeeId: `emp-${i + 1}`,
      employeeName: employee.name,
      employeeEmail: employee.email,
      employeeDepartment: employee.department,
      employeeRole: employee.role,
      leaveType,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalDays: days,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      status,
      submittedDate: submittedDate.toISOString().split("T")[0],
      reviewedBy: status !== "pending" ? "Admin User" : undefined,
      reviewedDate: status !== "pending" ? new Date().toISOString().split("T")[0] : undefined,
      comments: status === "rejected" ? "Insufficient leave balance" : undefined,
      leaveBalanceBefore: balanceBefore,
      leaveBalanceAfter: balanceAfter,
    });
  }

  return requests;
};

let mockLeaveRequests: LeaveRequest[] = generateMockLeaveRequests();

export const leaveService = {
  async getLeaveRequests(
    filters: LeaveFilters = {},
    sort: LeaveSort = { field: "submittedDate", direction: "desc" },
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ data: LeaveRequest[]; total: number; page: number; pageSize: number }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = [...mockLeaveRequests];

    if (filters.employeeName) {
      filtered = filtered.filter((lr) =>
        lr.employeeName.toLowerCase().includes(filters.employeeName!.toLowerCase())
      );
    }

    if (filters.department) {
      filtered = filtered.filter((lr) => lr.employeeDepartment === filters.department);
    }

    if (filters.leaveType) {
      filtered = filtered.filter((lr) => lr.leaveType === filters.leaveType);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((lr) => lr.startDate >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((lr) => lr.endDate <= filters.dateTo!);
    }

    if (filters.status) {
      filtered = filtered.filter((lr) => lr.status === filters.status);
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

  async getLeaveRequest(id: string): Promise<LeaveRequest | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockLeaveRequests.find((lr) => lr.id === id) || null;
  },

  async approveLeaveRequest(id: string, comment?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const request = mockLeaveRequests.find((lr) => lr.id === id);
    if (request) {
      request.status = "approved";
      request.reviewedBy = "Admin User";
      request.reviewedDate = new Date().toISOString().split("T")[0];
      if (comment) request.comments = comment;
    }
  },

  async rejectLeaveRequest(id: string, comment: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const request = mockLeaveRequests.find((lr) => lr.id === id);
    if (request) {
      request.status = "rejected";
      request.reviewedBy = "Admin User";
      request.reviewedDate = new Date().toISOString().split("T")[0];
      request.comments = comment;
    }
  },

  async bulkApprove(ids: string[], comment?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    ids.forEach((id) => {
      const request = mockLeaveRequests.find((lr) => lr.id === id);
      if (request) {
        request.status = "approved";
        request.reviewedBy = "Admin User";
        request.reviewedDate = new Date().toISOString().split("T")[0];
        if (comment) request.comments = comment;
      }
    });
  },

  async bulkReject(ids: string[], comment: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    ids.forEach((id) => {
      const request = mockLeaveRequests.find((lr) => lr.id === id);
      if (request) {
        request.status = "rejected";
        request.reviewedBy = "Admin User";
        request.reviewedDate = new Date().toISOString().split("T")[0];
        request.comments = comment;
      }
    });
  },

  getDepartments(): string[] {
    return Array.from(new Set(mockLeaveRequests.map((lr) => lr.employeeDepartment))).sort();
  },
};


