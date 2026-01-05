import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { Role } from "@/lib/constants/roles";

interface DashboardShellProps {
  children: ReactNode;
  role: Role;
}

export default function DashboardShell({
  children,
  role,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden ml-0 lg:ml-72">
        <TopNav role={role} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
