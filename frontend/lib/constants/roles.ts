export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  DEPT_LEAD: "dept_lead",
  EMPLOYEE: "employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

