import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface UserWithRole {
  id: string;
  display_name: string | null;
  role: string;
}

export interface CountryAssignment {
  id: string;
  user_id: string;
  country_id: string;
  created_at: string;
  country?: {
    id: string;
    name: string;
    code: string;
  };
  user_role?: {
    user_id: string;
    role: string;
    display_name: string | null;
  };
}

export interface RegionAssignment {
  id: string;
  user_id: string;
  region_id: string;
  created_at: string;
  region?: {
    id: string;
    name: string;
    country?: {
      id: string;
      name: string;
      code: string;
    };
  };
  user_role?: {
    user_id: string;
    role: string;
    display_name: string | null;
  };
}

export interface BranchAssignment {
  id: string;
  user_id: string;
  branch_id: string;
  created_at: string;
  branch?: {
    id: string;
    name: string;
    region?: {
      id: string;
      name: string;
      country?: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
  user_role?: {
    user_id: string;
    role: string;
    display_name: string | null;
  };
}

export interface AssignmentCreate {
  user_id: string;
  country_id?: string;
  region_id?: string;
  branch_id?: string;
}

// Get all users with roles (excluding admins)
export const useUsersWithRoles = () => {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const data = await fastapiClient.get<UserWithRole[]>('/user-assignments/users-with-roles');
      return data;
    },
  });
};

// Get all country assignments
export const useAllCountryAssignments = () => {
  return useQuery({
    queryKey: ['all-country-assignments'],
    queryFn: async () => {
      const data = await fastapiClient.get<CountryAssignment[]>('/user-assignments/country-assignments');
      return data;
    },
  });
};

// Get all region assignments
export const useAllRegionAssignments = () => {
  return useQuery({
    queryKey: ['all-region-assignments'],
    queryFn: async () => {
      const data = await fastapiClient.get<RegionAssignment[]>('/user-assignments/region-assignments');
      return data;
    },
  });
};

// Get all branch assignments
export const useAllBranchAssignments = () => {
  return useQuery({
    queryKey: ['all-branch-assignments'],
    queryFn: async () => {
      const data = await fastapiClient.get<BranchAssignment[]>('/user-assignments/branch-assignments');
      return data;
    },
  });
};

// Assign user to country
export const useAssignUserToCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: { user_id: string; country_id: string }) => {
      const data = await fastapiClient.post<CountryAssignment>('/user-assignments/country-assignments', assignment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-country-assignments'] });
    },
  });
};

// Assign user to region
export const useAssignUserToRegion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: { user_id: string; region_id: string }) => {
      const data = await fastapiClient.post<RegionAssignment>('/user-assignments/region-assignments', assignment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-region-assignments'] });
    },
  });
};

// Assign user to branch
export const useAssignUserToBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: { user_id: string; branch_id: string }) => {
      const data = await fastapiClient.post<BranchAssignment>('/user-assignments/branch-assignments', assignment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-branch-assignments'] });
    },
  });
};

// Remove user assignment
export const useRemoveUserAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type, 
      assignmentId 
    }: { 
      type: 'country' | 'region' | 'branch'; 
      assignmentId: string;
    }) => {
      let endpoint: string;
      switch (type) {
        case 'country':
          endpoint = `/user-assignments/country-assignments/${assignmentId}`;
          break;
        case 'region':
          endpoint = `/user-assignments/region-assignments/${assignmentId}`;
          break;
        case 'branch':
          endpoint = `/user-assignments/branch-assignments/${assignmentId}`;
          break;
      }

      await fastapiClient.delete(endpoint);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [`all-${variables.type}-assignments`] 
      });
    },
  });
};