import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export function useAssetTransfers(skip: number = 0, limit: number = 50) {
	return useQuery({
		queryKey: ['asset-transfers', skip, limit],
		queryFn: () => fastapiClient.listAssetTransfers(skip, limit),
	});
}