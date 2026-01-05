import { ROLES, type Role } from "./constants/roles";

export type { Role } from "./constants/roles";

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  roles?: Role[];
}

export const navigation: Record<Role, NavItem[]> = {
  [ROLES.ADMIN]: [
    { title: "Dashboard", href: "/admin", icon: "dashboard" },
    { title: "Employees", href: "/admin/employees", icon: "users" },
    { title: "Payroll", href: "/admin/payroll", icon: "dollar-sign" },
    { title: "Reports", href: "/admin/reports", icon: "bar-chart" },
    { title: "Settings", href: "/admin/settings", icon: "settings" },
  ],
  [ROLES.HR]: [
    { title: "Dashboard", href: "/hr", icon: "dashboard" },
    { title: "Employees", href: "/hr/employees", icon: "users" },
    { title: "Time Tracking", href: "/hr/time-tracking", icon: "clock" },
    { title: "Leave Management", href: "/hr/leave", icon: "calendar" },
    { title: "Payroll", href: "/hr/payroll", icon: "dollar-sign" },
  ],
  [ROLES.MANAGER]: [
    { title: "Dashboard", href: "/manager", icon: "dashboard" },
    { title: "Team", href: "/manager/team", icon: "users" },
    { title: "Time Approval", href: "/manager/approvals", icon: "check-circle" },
    { title: "Reports", href: "/manager/reports", icon: "bar-chart" },
  ],
  [ROLES.EMPLOYEE]: [
    { title: "Dashboard", href: "/employee", icon: "dashboard" },
    { title: "Time Sheet", href: "/employee/timesheet", icon: "clock" },
    { title: "Pay Stubs", href: "/employee/paystubs", icon: "file-text" },
    { title: "Leave", href: "/employee/leave", icon: "calendar" },
  ],
};

