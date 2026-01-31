'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { adminService, DashboardValidationError } from "@/lib/services/adminService";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useAdminDashboardQuery } from "@/lib/hooks/useAdminDashboardQuery";
import DashboardErrorBoundary from "@/components/errors/DashboardErrorBoundary";
import ErrorFallback from "@/components/errors/ErrorFallback";
import {
  NoKPIDataEmptyState,
  NoPayrollActivityEmptyState,
  NoDepartmentBreakdownEmptyState,
  DashboardUnavailableEmptyState,
} from "@/components/empty-states/DashboardEmptyStates";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { useAnnouncement } from "@/lib/hooks/useAnnouncement";

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
function formatLastUpdated(timestamp: Date | null): string {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const announce = useAnnouncement();
  
  // Use React Query hook for data fetching with automatic caching and refetching
  const {
    data: dashboardData,
    isLoading,
    isRefreshing,
    error,
    refresh,
    dataUpdatedAt,
  } = useAdminDashboardQuery();

  // Announce data refresh to screen readers
  useEffect(() => {
    if (isRefreshing) {
      announce("Refreshing dashboard data");
    }
  }, [isRefreshing, announce]);

  // Announce successful data load
  useEffect(() => {
    if (dashboardData && !isLoading && !isRefreshing) {
      announce("Dashboard data loaded successfully");
    }
  }, [dashboardData, isLoading, isRefreshing, announce]);

  useEffect(() => {
    // Ensure user is admin or manager - redirect if not
    if (!authLoading && user) {
      const userRole = user.role?.toLowerCase().trim();
      if (userRole !== 'admin' && userRole !== 'manager') {
        if (userRole === 'employee') {
          router.push('/employee');
        } else if (userRole === 'dept_lead' || userRole === 'department_lead') {
          router.push('/department_lead');
        }
        return;
      }
    }
  }, [user, authLoading, router]);

  // Calculate last updated timestamp
  const lastUpdated = useMemo(() => {
    return dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  }, [dataUpdatedAt]);

  // Memoized handlers for performance optimization
  const handleRefresh = useCallback(() => {
    refresh();
    announce("Refreshing dashboard data");
  }, [refresh, announce]);

  const handleRetry = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleGoHome = useCallback(() => {
    router.push("/admin");
  }, [router]);

  const handleGoToPayroll = useCallback(() => {
    router.push("/admin/payroll");
  }, [router]);

  const handleGoToDepartments = useCallback(() => {
    router.push("/admin/departments");
  }, [router]);

  // State: Loading (initial load with no cached data)
  // Show skeleton loader that matches the dashboard layout to prevent CLS
  if (isLoading && !dashboardData) {
    return (
      <DashboardErrorBoundary>
        <DashboardSkeleton />
      </DashboardErrorBoundary>
    );
  }

  // State: Error (with no cached data to show)
  if (error && !dashboardData) {
    // Check if it's a validation error for more specific messaging
    const isValidationError = error instanceof DashboardValidationError || 
      (error instanceof Error && error.message.includes('Invalid dashboard data'));
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ErrorFallback
          error={error instanceof Error ? error : new Error(String(error))}
          resetErrorBoundary={handleRetry}
          title={isValidationError ? "Data Validation Error" : "Failed to Load Dashboard"}
          message={
            isValidationError
              ? "The dashboard data received from the server doesn't match the expected format. This may indicate a backend issue. Please contact support if this problem persists."
              : "We encountered an issue while loading your dashboard data. This may be due to a network issue or a temporary service problem."
          }
          actionLabel="Retry"
          onSecondaryAction={handleGoHome}
          secondaryActionLabel="Return to Dashboard"
        />
      </div>
    );
  }

  // State: Empty (no data available)
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <DashboardUnavailableEmptyState
          onRefresh={handleRetry}
          onGoHome={handleGoHome}
        />
      </div>
    );
  }

  // State: Success (data loaded successfully)
  // Extract data with safe defaults to prevent null/undefined errors
  const { kpis, recentPayrollActivity, departmentBreakdown } = dashboardData;
  
  // Validate KPI data exists - if missing, show empty state
  if (!kpis) {
    return (
      <DashboardErrorBoundary>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-0">
          <NoKPIDataEmptyState onRefresh={handleRetry} />
        </div>
      </DashboardErrorBoundary>
    );
  }

  // Safe defaults for nested data to prevent null/undefined errors
  const safeRecentPayrollActivity = recentPayrollActivity || [];
  const safeDepartmentBreakdown = departmentBreakdown || { departments: [], largestDepartment: null };
  const safeDepartments = safeDepartmentBreakdown.departments || [];

  const maxEmployees = safeDepartments.length > 0
    ? Math.max(...safeDepartments.map(d => d.employees || 0))
    : 1;

  return (
    <DashboardErrorBoundary>
      <main id="main-content" tabIndex={-1} className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-0 relative" role="main" aria-label="Admin Dashboard">
      {/* Background refresh indicator - subtle overlay when refreshing */}
      {isRefreshing && dashboardData && (
        <div 
          className="absolute inset-0 bg-white/30 backdrop-blur-[2px] z-40 flex items-start justify-center pt-8 rounded-lg pointer-events-none"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" aria-hidden="true"></div>
            <span className="text-sm text-[#2563EB] font-medium">Refreshing data...</span>
          </div>
        </div>
      )}
      {/* Header Section - Mobile First */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A]">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-[#64748B]">
            Comprehensive overview of your organization&apos;s payroll and workforce
          </p>
          {/* Last updated timestamp */}
          {lastUpdated && (
            <p className="text-xs text-[#64748B] mt-1" aria-live="polite" aria-atomic="true">
              <span className="sr-only">Dashboard last updated</span>
              Last updated: {formatLastUpdated(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Manual Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="default"
            className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#2563EB] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isRefreshing ? "Refreshing dashboard data, please wait" : "Refresh dashboard data"}
            aria-busy={isRefreshing}
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Link href="/admin/reports" aria-label="Navigate to reports page to generate reports">
            <Button 
              variant="gradient" 
              size="default"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold">Generate Report</span>
            </Button>
          </Link>
          <Link href="/admin/settings" aria-label="Navigate to settings page">
            <Button 
              variant="outline" 
              size="default"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#2563EB] font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Key Metrics Grid - Mobile First Responsive */}
      <section aria-labelledby="key-metrics-heading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <h2 id="key-metrics-heading" className="sr-only">Key Performance Indicators</h2>
        {/* Total Employees */}
        <Card className="relative overflow-hidden border-2 border-slate-300 bg-white hover:shadow-xl transition-all duration-300 shadow-sm" role="region" aria-labelledby="total-employees-title">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle id="total-employees-title" className="text-sm sm:text-base font-semibold text-[#0F172A]">
                Total Employees
              </CardTitle>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold text-[#0F172A]" aria-label={`Total employees: ${kpis.totalEmployees}`}>
                {kpis.totalEmployees}
              </p>
              {kpis.employeeGrowth !== 0 && (
                <Badge 
                  className={`${kpis.employeeGrowth > 0 ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20' : 'bg-red-100 text-red-700 border-red-200'} text-xs`}
                  aria-label={`Employee growth: ${kpis.employeeGrowth > 0 ? '+' : ''}${kpis.employeeGrowth} percent`}
                >
                  {kpis.employeeGrowth > 0 ? '+' : ''}{kpis.employeeGrowth}%
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2">
              Active employees across all departments
            </p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="text-xs text-[#64748B]">
                <span className="sr-only">New hires in the last 30 days:</span>
                Last 30 days: +{kpis.newHiresLast30Days} new hires
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Status */}
        <Card className="relative overflow-hidden border-2 border-slate-300 bg-white hover:shadow-xl transition-all duration-300 shadow-sm" role="region" aria-labelledby="payroll-status-title">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle id="payroll-status-title" className="text-sm sm:text-base font-semibold text-[#0F172A]">
                Payroll Status
              </CardTitle>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold text-[#0F172A]" aria-label={`Total payroll: ${adminService.formatLargeCurrency(kpis.payrollStatus.total)}`}>
                {adminService.formatLargeCurrency(kpis.payrollStatus.total)}
              </p>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs" aria-label={`Payroll status: ${kpis.payrollStatus.status}`}>
                {kpis.payrollStatus.status}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2">
              Total payroll for current period
            </p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="text-xs text-[#64748B]">
                {kpis.payrollStatus.nextPayday 
                  ? `Next payroll: ${adminService.formatDate(kpis.payrollStatus.nextPayday)}`
                  : 'No upcoming payroll'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="relative overflow-hidden border-2 border-slate-300 bg-white hover:shadow-xl transition-all duration-300 shadow-sm" role="region" aria-labelledby="pending-approvals-title">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle id="pending-approvals-title" className="text-sm sm:text-base font-semibold text-[#0F172A]">
                Pending Approvals
              </CardTitle>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center" aria-hidden="true">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold text-[#0F172A]" aria-label={`Pending approvals: ${kpis.pendingApprovals}`}>
                {kpis.pendingApprovals}
              </p>
              {kpis.pendingApprovals > 0 && (
                <Badge className="bg-[#F59E0B] text-white border-[#F59E0B] text-xs" aria-label="Urgent attention required">
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2">
              Requires immediate attention
            </p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="text-xs text-[#64748B]">
                <span className="sr-only">Breakdown: </span>
                {kpis.pendingTimesheets} time sheets • {kpis.pendingLeaveRequests} leave requests • {kpis.pendingPayroll} payroll
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Department Count */}
        <Card className="relative overflow-hidden border-2 border-slate-300 bg-white hover:shadow-xl transition-all duration-300 shadow-sm" role="region" aria-labelledby="departments-title">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle id="departments-title" className="text-sm sm:text-base font-semibold text-[#0F172A]">
                Departments
              </CardTitle>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-purple-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold text-[#0F172A]" aria-label={`Total departments: ${kpis.totalDepartments}`}>
                {kpis.totalDepartments}
              </p>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs" aria-label="All departments are active">
                Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2">
              Active departments in organization
            </p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="text-xs text-[#64748B]">
                <span className="sr-only">Largest department: </span>
                {safeDepartmentBreakdown.largestDepartment || 'No departments'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Secondary Metrics Row - Responsive */}
      <section aria-labelledby="secondary-metrics-heading" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <h2 id="secondary-metrics-heading" className="sr-only">Secondary Metrics</h2>
        <Card className="border-2 border-slate-300 bg-white hover:shadow-lg transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#64748B]">Average Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
              {adminService.formatCurrency(kpis.averageSalary)}
            </p>
            <p className="text-xs text-[#64748B] mt-1">Per employee annually</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white hover:shadow-lg transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#64748B]">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{kpis.leaveRequestsThisMonth}</p>
            <p className="text-xs text-[#64748B] mt-1">Pending this month</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white hover:shadow-lg transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#64748B]">Time Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{kpis.timesheetCompletionRate}%</p>
            <p className="text-xs text-[#64748B] mt-1">Completion rate</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white hover:shadow-lg transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#64748B]">Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-[#16A34A]" aria-label={`Compliance rate: ${kpis.compliance} percent`}>{kpis.compliance}%</p>
            <p className="text-xs text-[#64748B] mt-1">Regulatory compliance</p>
          </CardContent>
        </Card>
      </section>

      {/* Main Content Grid - Responsive */}
      <section aria-labelledby="main-content-heading" className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <h2 id="main-content-heading" className="sr-only">Main Dashboard Content</h2>
        {/* Recent Payroll Activity */}
        <Card className="lg:col-span-2 border-2 border-slate-300 bg-white shadow-sm" role="region" aria-labelledby="payroll-activity-title">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle id="payroll-activity-title" className="text-lg sm:text-xl font-bold text-[#0F172A]">Recent Payroll Activity</CardTitle>
              <Link href="/admin/payroll" aria-label="View all payroll activity">
                <Button variant="ghost" size="sm" className="text-[#2563EB] hover:text-[#1D4ED8] w-full sm:w-auto font-medium">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {safeRecentPayrollActivity.length === 0 ? (
                <NoPayrollActivityEmptyState
                  onViewAll={handleGoToPayroll}
                />
              ) : (
                safeRecentPayrollActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.status === "Completed" ? "bg-[#16A34A]/10" : "bg-blue-100"
                      }`}>
                        {item.status === "Completed" ? (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base text-[#0F172A] truncate">{item.period}</p>
                        <p className="text-xs sm:text-sm text-[#64748B]">{item.employees} employees • {item.date}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
                      <p className="font-bold text-sm sm:text-base text-[#0F172A]">
                        {adminService.formatLargeCurrency(item.amount)}
                      </p>
                      <Badge
                        className={item.status === "Completed" ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20" : "bg-[#2563EB] text-white border-[#2563EB]"}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-2 border-slate-300 bg-white shadow-sm" role="region" aria-labelledby="quick-actions-title">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle id="quick-actions-title" className="text-base sm:text-lg lg:text-xl font-bold text-[#0F172A]">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <nav aria-label="Quick action navigation" className="space-y-3 sm:space-y-4">
              <Link href="/admin/payroll" className="w-full block" aria-label="Navigate to process payroll">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">💰</span>
                  <span className="flex-1 text-left truncate">Process Payroll</span>
                </Button>
              </Link>
              <Link href="/admin/employees" className="w-full block" aria-label="Navigate to add employee">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">👤</span>
                  <span className="flex-1 text-left truncate">Add Employee</span>
                </Button>
              </Link>
              <Link href="/admin/reports" className="w-full block" aria-label="Navigate to generate report">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">📊</span>
                  <span className="flex-1 text-left truncate">Generate Report</span>
                </Button>
              </Link>
              <div className="h-2 sm:h-3" aria-hidden="true"></div>
              <Link href="/admin/timesheets" className="w-full block" aria-label="Navigate to approve timesheets">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">⏰</span>
                  <span className="flex-1 text-left truncate">Approve Time Sheets</span>
                </Button>
              </Link>
              <Link href="/admin/leaves" className="w-full block" aria-label="Navigate to manage leave">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">📅</span>
                  <span className="flex-1 text-left truncate">Manage Leave</span>
                </Button>
              </Link>
              <Link href="/admin/tasks" className="w-full block" aria-label="Navigate to manage tasks">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">✅</span>
                  <span className="flex-1 text-left truncate">Manage Tasks</span>
                </Button>
              </Link>
              <Link href="/admin/settings" className="w-full block" aria-label="Navigate to system settings">
                <Button 
                  variant="gradient" 
                  className="w-full justify-start items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:opacity-90 h-10 sm:h-11 px-3 sm:px-4 md:px-6" 
                  size="default"
                >
                  <span className="text-base sm:text-lg md:text-xl flex-shrink-0" aria-hidden="true">⚙️</span>
                  <span className="flex-1 text-left truncate">System Settings</span>
                </Button>
              </Link>
            </nav>
          </CardContent>
        </Card>
      </section>

      {/* Department Breakdown - Responsive */}
      <Card className="border border-slate-200 bg-white" role="region" aria-labelledby="department-breakdown-title">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <CardTitle id="department-breakdown-title" className="text-base sm:text-lg lg:text-xl font-bold text-[#0F172A]">Department Breakdown</CardTitle>
            <Link href="/admin/departments" aria-label="View department details">
              <Button variant="ghost" size="sm" className="text-[#2563EB] hover:text-[#1D4ED8] w-full sm:w-auto font-medium text-xs sm:text-sm">
                View Details →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {safeDepartments.length === 0 ? (
              <div className="col-span-full">
                <NoDepartmentBreakdownEmptyState
                  onManageDepartments={handleGoToDepartments}
                />
              </div>
            ) : (
              safeDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-4 sm:p-5 rounded-lg border-2 border-slate-300 hover:shadow-lg transition-all bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h4 className="font-semibold text-sm sm:text-base text-[#0F172A] flex-1 min-w-0 pr-2 break-words">{dept.name}</h4>
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${dept.bgColor} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-[#64748B]">Employees</span>
                      <span className="font-semibold text-[#0F172A]">{dept.employees}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-[#64748B]">Annual Payroll</span>
                      <span className="font-semibold text-[#0F172A]">
                        {adminService.formatLargeCurrency(dept.payroll)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="w-full bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow={dept.employees} aria-valuemin={0} aria-valuemax={maxEmployees} aria-label={`${dept.name} employee count: ${dept.employees} out of ${maxEmployees} maximum`}>
                        <div
                          className={`${dept.barColor} h-2 rounded-full transition-all`}
                          style={{ width: `${maxEmployees > 0 ? (dept.employees / maxEmployees) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </main>
    </DashboardErrorBoundary>
  );
}
