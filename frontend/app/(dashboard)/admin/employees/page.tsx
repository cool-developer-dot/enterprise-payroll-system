"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmployeeTable from "@/components/employees/EmployeeTable";
import EmployeeFilters from "@/components/employees/EmployeeFilters";
import EmployeeDetailDrawer from "@/components/employees/EmployeeDetailDrawer";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import {
  employeeService,
  type Employee,
  type EmployeeFilter,
  type EmployeeSort,
} from "@/lib/services/employeeService";

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmployeeFilter>({});
  const [sort, setSort] = useState<EmployeeSort>({ field: "name", direction: "asc" });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    employeeService
      .getEmployees(filters, sort, pagination)
      .then((data) => {
        if (!cancelled) {
          setEmployees(data.items);
          setTotal(data.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const errorMessage = err?.message || "Failed to load employees. Please try again.";
          setError(errorMessage);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, pagination.page, pagination.pageSize]);

  const handleFilterChange = (newFilters: Partial<EmployeeFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field: keyof Employee, direction: "asc" | "desc") => {
    setSort({ field, direction });
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    setSelectedEmployees([]);
  };

  const handleSelectEmployee = (id: string, isSelected: boolean) => {
    setSelectedEmployees((prev) =>
      isSelected ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmployees(employees.map((e) => e.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleViewEmployee = async (id: string) => {
    const employee = await employeeService.getEmployee(id);
    if (employee) {
      setSelectedEmployee(employee);
      setIsDrawerOpen(true);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">Employees</h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Manage employee directory and lifecycle
          </p>
        </div>
        <Button
          variant="gradient"
          size="default"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
        >
          + Add Employee
        </Button>
      </div>

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeFilters filters={filters} onFilterChange={handleFilterChange} />
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-[#0F172A]">All Employees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
              <span className="ml-3 text-[#64748B]">Loading employees...</span>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-[#DC2626] font-medium">{error}</div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-[#64748B]">No employees found.</div>
          ) : (
            <EmployeeTable
              employees={employees}
              selectedEmployees={selectedEmployees}
              onSelectEmployee={handleSelectEmployee}
              onSelectAll={handleSelectAll}
              allSelected={selectedEmployees.length === employees.length && employees.length > 0}
              sort={sort}
              onSortChange={handleSortChange}
              pagination={{ ...pagination, total }}
              onPageChange={handlePageChange}
              onViewEmployee={handleViewEmployee}
            />
          )}
        </CardContent>
      </Card>

      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          const loadData = async () => {
            setLoading(true);
            try {
              const data = await employeeService.getEmployees(filters, sort, pagination);
              setEmployees(data.items);
              setTotal(data.total);
            } catch (err) {
              setError("Failed to load employees.");
            } finally {
              setLoading(false);
            }
          };
          loadData();
        }}
      />
    </div>
  );
}

