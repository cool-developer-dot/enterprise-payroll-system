"use client";

import { usePathname } from "next/navigation";
import DashboardShell from "./DashboardShell";
import { ROLES, type Role } from "@/lib/constants/roles";

function getRoleFromPath(pathname: string): Role {
  if (pathname.startsWith("/admin")) return ROLES.ADMIN;
  if (pathname.startsWith("/hr")) return ROLES.HR;
  if (pathname.startsWith("/manager")) return ROLES.MANAGER;
  if (pathname.startsWith("/employee")) return ROLES.EMPLOYEE;
  return ROLES.ADMIN;
}

export default function DashboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = getRoleFromPath(pathname);

  return <DashboardShell role={role}>{children}</DashboardShell>;
}

