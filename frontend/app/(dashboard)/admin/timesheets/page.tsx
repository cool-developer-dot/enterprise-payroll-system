"use client";

import { useState, useEffect } from "react";
import TimeSheetTable from "@/components/timesheets/TimeSheetTable";
import TimeSheetFilters from "@/components/timesheets/TimeSheetFilters";
import ApprovalModal from "@/components/timesheets/ApprovalModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  timesheetService,
  type TimeSheet,
  type TimeSheetFilters as Filters,
  type TimeSheetSort,
} from "@/lib/services/timesheetService";

export default function TimeSheetApprovalPage() {
  const [timeSheets, setTimeSheets] = useState<TimeSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<TimeSheetSort>({ field: "date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject" | "bulk-approve" | "bulk-reject" | null>(null);
  const [modalTimesheetId, setModalTimesheetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pageSize = 10;

  const loadTimeSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await timesheetService.getTimeSheets(filters, sort, page, pageSize);
      setTimeSheets(result.data);
      setTotal(result.total);
    } catch (err) {
      setError("Failed to load timesheets. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, page]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSort = (field: keyof TimeSheet) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
    });
    setPage(1);
  };

  const handleApprove = (id: string) => {
    setModalType("approve");
    setModalTimesheetId(id);
    setModalOpen(true);
  };

  const handleReject = (id: string) => {
    setModalType("reject");
    setModalTimesheetId(id);
    setModalOpen(true);
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    setModalType("bulk-approve");
    setModalOpen(true);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    setModalType("bulk-reject");
    setModalOpen(true);
  };

  const handleModalSubmit = async (comment?: string) => {
    if (!modalType) return;

    setActionLoading(modalType);
    try {
      if (modalType === "approve" && modalTimesheetId) {
        await timesheetService.approveTimeSheet(modalTimesheetId, comment);
      } else if (modalType === "reject" && modalTimesheetId && comment) {
        await timesheetService.rejectTimeSheet(modalTimesheetId, comment);
      } else if (modalType === "bulk-approve") {
        await timesheetService.bulkApprove(selectedIds, comment);
      } else if (modalType === "bulk-reject" && comment) {
        await timesheetService.bulkReject(selectedIds, comment);
      }
      setModalOpen(false);
      setModalType(null);
      setModalTimesheetId(null);
      setSelectedIds([]);
      await loadTimeSheets();
    } catch (err) {
      setError("Failed to process request. Please try again.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(timeSheets.filter((ts) => ts.status === "pending").map((ts) => ts.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
            Time Sheet Approval
          </h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Review and approve employee time sheets
          </p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="default"
              onClick={handleBulkApprove}
              disabled={actionLoading !== null}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            >
              Approve Selected ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleBulkReject}
              disabled={actionLoading !== null}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Reject Selected ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <TimeSheetFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        departments={timesheetService.getDepartments()}
        roles={timesheetService.getRoles()}
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <TimeSheetTable
        timeSheets={timeSheets}
        loading={loading}
        sort={sort}
        onSort={handleSort}
        onApprove={handleApprove}
        onReject={handleReject}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        actionLoading={actionLoading}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <ApprovalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalType(null);
          setModalTimesheetId(null);
        }}
        type={modalType}
        onSubmit={handleModalSubmit}
        loading={actionLoading !== null}
        timesheetCount={modalType?.startsWith("bulk") ? selectedIds.length : 1}
      />
    </div>
  );
}

