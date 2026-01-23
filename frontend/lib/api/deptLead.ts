import { apiClient } from './client';

export interface DeptLeadDashboardData {
  departmentEmployees: number;
  activeTasks: number;
  pendingTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  teamPerformance: number;
  timesheetsPending: number;
}

export interface TeamMember {
  _id: string;
  id?: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
  position?: string;
  status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const deptLeadApi = {
  async getDashboard(): Promise<ApiResponse<DeptLeadDashboardData>> {
    return apiClient.get<ApiResponse<DeptLeadDashboardData>>('/dept_lead/dashboard');
  },

  async getTeam(): Promise<ApiResponse<{ team: TeamMember[] }>> {
    return apiClient.get<ApiResponse<{ team: TeamMember[] }>>('/dept_lead/team');
  },
};
