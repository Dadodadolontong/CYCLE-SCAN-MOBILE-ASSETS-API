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
  console.log("🔍 [useCategories] Hook called");
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log("🔍 [useCategories] Starting API call to /categories");
      try {
        const data = await fastapiClient.get<Category[]>('/categories');
        console.log("🔍 [useCategories] API call successful, categories count:", data?.length || 0);
        return data.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error("🔍 [useCategories] API call failed:", error);
        throw error;
      }
    },
  });
};