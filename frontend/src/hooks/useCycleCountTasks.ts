import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface CycleCountTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  assigned_to?: string;
  created_by?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  location_filter?: string | null;
}

export interface CycleCountItem {
  id: string;
  task_id: string;
  asset_id: string;
  status: string;
  scanned_at?: string;
  created_at: string;
  updated_at: string;
}

export const useCycleCountTasks = (
  userRole?: string,
  userId?: string,
  page: number = 1,
  pageSize: number = 20,
  statusFilter: string = 'all'
) => {
  return useQuery({
    queryKey: ['cycle_count_tasks', userRole, userId, page, pageSize, statusFilter],
    queryFn: async () => {
      if (!userId) {
        return { items: [], total: 0 };
      }

      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
      });
      
      // Only add status filter if it's not 'all'
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const url = `/cycle-count-tasks?${params.toString()}`;
      const data = await fastapiClient.get<{ items: CycleCountTask[]; total: number }>(url);
      return data;
    },
    enabled: !!userId,
  });
};

export const useCycleCountTaskById = (id?: string) => {
  return useQuery({
    queryKey: ['cycle_count_tasks', id],
    queryFn: async () => {
      if (!id) return null;
      
      const data = await fastapiClient.get<CycleCountTask>(`/cycle-count-tasks/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCycleCountItems = (taskId?: string) => {
  return useQuery({
    queryKey: ['cycle_count_items', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const data = await fastapiClient.get<CycleCountItem[]>(`/cycle-count-items/task/${taskId}`);
      return data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    enabled: !!taskId,
  });
};

export const useCreateCycleCountTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Omit<CycleCountTask, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await fastapiClient.post<CycleCountTask>('/cycle-count-tasks/', task);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle_count_tasks'] });
    },
  });
};

export const useUpdateCycleCountTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CycleCountTask> }) => {
      const data = await fastapiClient.put<CycleCountTask>(`/cycle-count-tasks/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycle_count_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['cycle_count_tasks', data.id] });
    },
  });
};

export const useCreateCycleCountItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<CycleCountItem, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await fastapiClient.post<CycleCountItem>('/cycle-count-items/', item);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycle_count_items', data.task_id] });
    },
  });
};

export const useUpdateCycleCountItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CycleCountItem> }) => {
      const data = await fastapiClient.put<CycleCountItem>(`/cycle-count-items/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycle_count_items', data.task_id] });
    },
  });
};