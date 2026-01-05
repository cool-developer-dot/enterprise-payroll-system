"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PayrollSummaryCard from "@/components/reports/PayrollSummaryCard";
import AttendanceOverviewCard from "@/components/reports/AttendanceOverviewCard";
import LeaveAnalyticsCard from "@/components/reports/LeaveAnalyticsCard";
import DepartmentCostCard from "@/components/reports/DepartmentCostCard";
import { reportsService, type ReportData } from "@/lib/services/reportsService";
import { employeeService } from "@/lib/services/employeeService";

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [department, setDepartment] = useState<string>("");
  const departments = employeeService.getDepartments();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportsService.getReportData(dateFrom, dateTo, department || undefined).then((data) => {
      if (!cancelled) {
        setReportData(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, department]);

  const handleExport = (type: "pdf" | "excel", reportType: string) => {
    if (type === "pdf") {
      reportsService.exportPDF(reportType);
    } else {
      reportsService.exportExcel(reportType);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">Executive Reports</h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Comprehensive analytics and insights
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#0F172A]">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#0F172A]">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#0F172A]">Department</label>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
          <span className="ml-3 text-[#64748B]">Loading reports...</span>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <PayrollSummaryCard
            data={reportData.payrollSummary}
            onExport={(type) => handleExport(type, "payroll-summary")}
          />
          <AttendanceOverviewCard
            data={reportData.attendanceOverview}
            onExport={(type) => handleExport(type, "attendance-overview")}
          />
          <LeaveAnalyticsCard
            data={reportData.leaveAnalytics}
            onExport={(type) => handleExport(type, "leave-analytics")}
          />
          <DepartmentCostCard
            data={reportData.departmentCosts}
            onExport={(type) => handleExport(type, "department-costs")}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-[#64748B]">No report data available</div>
      )}
    </div>
  );
}

