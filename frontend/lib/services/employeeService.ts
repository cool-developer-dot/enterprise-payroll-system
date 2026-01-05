export type EmploymentType = "full-time" | "part-time" | "contract" | "intern";
export type EmploymentStatus = "active" | "inactive" | "on-leave" | "terminated";
export type SalaryType = "monthly" | "hourly" | "annual";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  joinDate: string;
  salaryType: SalaryType;
  contractStart?: string;
  contractEnd?: string;
}

export interface EmployeeFilter {
  search?: string;
  department?: string;
  role?: string;
  employmentType?: EmploymentType;
  status?: EmploymentStatus;
}

export interface EmployeeSort {
  field: keyof Employee;
  direction: "asc" | "desc";
}

const mockEmployees: Employee[] = [
  {
    id: "emp001",
    name: "Alice Johnson",
    email: "alice.johnson@company.com",
    department: "Engineering",
    role: "Senior Developer",
    employmentType: "full-time",
    status: "active",
    joinDate: "2022-01-15",
    salaryType: "monthly",
    contractStart: "2022-01-15",
  },
  {
    id: "emp002",
    name: "Bob Williams",
    email: "bob.williams@company.com",
    department: "Marketing",
    role: "Marketing Manager",
    employmentType: "full-time",
    status: "active",
    joinDate: "2021-06-20",
    salaryType: "monthly",
  },
  {
    id: "emp003",
    name: "Charlie Brown",
    email: "charlie.brown@company.com",
    department: "Sales",
    role: "Sales Representative",
    employmentType: "full-time",
    status: "active",
    joinDate: "2023-03-10",
    salaryType: "monthly",
  },
  {
    id: "emp004",
    name: "Diana Prince",
    email: "diana.prince@company.com",
    department: "HR",
    role: "HR Specialist",
    employmentType: "full-time",
    status: "on-leave",
    joinDate: "2020-11-05",
    salaryType: "monthly",
  },
  {
    id: "emp005",
    name: "Eve Adams",
    email: "eve.adams@company.com",
    department: "Engineering",
    role: "Junior Developer",
    employmentType: "part-time",
    status: "active",
    joinDate: "2023-08-22",
    salaryType: "hourly",
  },
  {
    id: "emp006",
    name: "Frank White",
    email: "frank.white@company.com",
    department: "Finance",
    role: "Accountant",
    employmentType: "full-time",
    status: "active",
    joinDate: "2021-09-12",
    salaryType: "monthly",
  },
  {
    id: "emp007",
    name: "Grace Lee",
    email: "grace.lee@company.com",
    department: "HR",
    role: "HR Manager",
    employmentType: "full-time",
    status: "active",
    joinDate: "2019-04-18",
    salaryType: "monthly",
  },
  {
    id: "emp008",
    name: "Henry King",
    email: "henry.king@company.com",
    department: "Sales",
    role: "Sales Manager",
    employmentType: "full-time",
    status: "active",
    joinDate: "2020-02-28",
    salaryType: "monthly",
  },
  {
    id: "emp009",
    name: "Ivy Green",
    email: "ivy.green@company.com",
    department: "Marketing",
    role: "Content Writer",
    employmentType: "contract",
    status: "active",
    joinDate: "2023-11-01",
    salaryType: "hourly",
    contractStart: "2023-11-01",
    contractEnd: "2024-11-01",
  },
  {
    id: "emp010",
    name: "Jack Black",
    email: "jack.black@company.com",
    department: "Engineering",
    role: "Tech Lead",
    employmentType: "full-time",
    status: "active",
    joinDate: "2018-07-15",
    salaryType: "monthly",
  },
  {
    id: "emp011",
    name: "Karen White",
    email: "karen.white@company.com",
    department: "Finance",
    role: "Financial Analyst",
    employmentType: "full-time",
    status: "inactive",
    joinDate: "2022-05-10",
    salaryType: "monthly",
  },
  {
    id: "emp012",
    name: "Liam Brown",
    email: "liam.brown@company.com",
    department: "HR",
    role: "Recruiter",
    employmentType: "intern",
    status: "active",
    joinDate: "2024-01-08",
    salaryType: "hourly",
  },
];

export const employeeService = {
  async getEmployees(
    filters: EmployeeFilter,
    sort: EmployeeSort,
    pagination: { page: number; pageSize: number }
  ): Promise<{ items: Employee[]; total: number }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = [...mockEmployees];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.email.toLowerCase().includes(search) ||
          e.department.toLowerCase().includes(search) ||
          e.role.toLowerCase().includes(search)
      );
    }

    if (filters.department) {
      filtered = filtered.filter((e) => e.department === filters.department);
    }

    if (filters.role) {
      filtered = filtered.filter((e) => e.role === filters.role);
    }

    if (filters.employmentType) {
      filtered = filtered.filter((e) => e.employmentType === filters.employmentType);
    }

    if (filters.status) {
      filtered = filtered.filter((e) => e.status === filters.status);
    }

    filtered.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;

    return { items: filtered.slice(start, end), total };
  },

  async getEmployee(id: string): Promise<Employee | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockEmployees.find((e) => e.id === id) || null;
  },

  getDepartments(): string[] {
    return Array.from(new Set(mockEmployees.map((e) => e.department))).sort();
  },

  getRoles(): string[] {
    return Array.from(new Set(mockEmployees.map((e) => e.role))).sort();
  },
};

