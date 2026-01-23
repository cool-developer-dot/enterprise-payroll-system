import { deptLeadApi, type DeptLeadDashboardData, type TeamMember } from '@/lib/api/deptLead';

const mapId = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(mapId);
  }
  if (typeof obj === 'object') {
    const mapped = { ...obj };
    if (mapped._id && !mapped.id) {
      mapped.id = mapped._id;
    }
    return mapped;
  }
  return obj;
};

export const deptLeadService = {
  async getDashboard(): Promise<DeptLeadDashboardData> {
    const response = await deptLeadApi.getDashboard();
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to load dashboard');
  },

  async getTeam(): Promise<TeamMember[]> {
    const response = await deptLeadApi.getTeam();
    if (response.success && response.data?.team) {
      return response.data.team.map(mapId);
    }
    return [];
  },
};

export type { DeptLeadDashboardData, TeamMember };
