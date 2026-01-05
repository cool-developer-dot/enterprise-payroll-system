import { ReactNode } from "react";
import { Role } from "@/lib/constants/roles";

interface RoleGateProps {
  role: Role;
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({
  role,
  allowedRoles,
  children,
  fallback = null,
}: RoleGateProps) {
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

