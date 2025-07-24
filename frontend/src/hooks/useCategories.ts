import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await fastapiClient.get<Category[]>('/categories');
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};