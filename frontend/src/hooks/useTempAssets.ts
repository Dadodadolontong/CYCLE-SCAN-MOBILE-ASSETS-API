import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type TempAsset = Tables<'temp_assets'> & {
  status: 'counted';
};

export const useTempAssets = () => {
  return useQuery({
    queryKey: ['temp_assets'],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];

      const { data, error } = await supabase
        .from('temp_assets')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform database temp assets to include status
      return data.map(asset => ({
        ...asset,
        status: 'counted' as const,
      })) as TempAsset[];
    },
  });
};

export const useCreateTempAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      description, 
      model, 
      build, 
      location_id, 
      barcode 
    }: { 
      description: string;
      model?: string;
      build?: string;
      location_id: string | null;
      barcode: string;
    }) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not authenticated');

      const insertData: TablesInsert<'temp_assets'> = {
        description,
        model: model || null,
        build: build || null,
        location: location_id,
        barcode,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('temp_assets')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, status: 'counted' as const };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp_assets'] });
    },
  });
};

export const useTempAssetsByLocation = (locationId?: string) => {
  return useQuery({
    queryKey: ['temp_assets', 'location', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];
      
      const { data, error } = await supabase
        .from('temp_assets')
        .select('*')
        .eq('location', locationId)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(asset => ({
        ...asset,
        status: 'counted' as const,
      })) as TempAsset[];
    },
    enabled: !!locationId,
  });
};