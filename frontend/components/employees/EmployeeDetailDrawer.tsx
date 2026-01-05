"use client";

import { Employee } from "@/lib/services/employeeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface EmployeeDetailDrawerProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
}

const getStatusBadge = (status: Employee["status"]) => {
  const styles = {
    active: "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20",
    inactive: "bg-slate-100 text-slate-700 border-slate-200",
    "on-leave": "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    terminated: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20",
  };
  return styles[status];
};

export default function EmployeeDetailDrawer({
  employee,
  isOpen,
  onClose,
}: EmployeeDetailDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0F172A]">Employee Details</h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {employee.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#0F172A]">{employee.name}</h3>
              <p className="text-sm text-[#64748B]">{employee.email}</p>
              <Badge className={cn("mt-2", getStatusBadge(employee.status))}>
                {employee.status.replace("-", " ")}
              </Badge>
            </div>
          </div>

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0F172A]">Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Department</p>
                  <p className="text-sm font-medium text-[#0F172A]">{employee.department}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Role</p>
                  <p className="text-sm font-medium text-[#0F172A]">{employee.role}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Employment Type</p>
                  <p className="text-sm font-medium text-[#0F172A] capitalize">
                    {employee.employmentType.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Salary Type</p>
                  <p className="text-sm font-medium text-[#0F172A] capitalize">
                    {employee.salaryType}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0F172A]">Contract Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Join Date</p>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {new Date(employee.joinDate).toLocaleDateString()}
                  </p>
                </div>
                {employee.contractStart && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Contract Start</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {new Date(employee.contractStart).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {employee.contractEnd && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Contract End</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {new Date(employee.contractEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0F172A]">Employment Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#16A34A]"></div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1).replace("-", " ")}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Since {new Date(employee.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="default"
              className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              Edit Employee
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626]/5"
            >
              Deactivate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

