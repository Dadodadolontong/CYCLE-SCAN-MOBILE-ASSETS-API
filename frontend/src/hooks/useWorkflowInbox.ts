import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export function useWorkflowInbox() {
	return useQuery({
		queryKey: ['workflow-inbox'],
		queryFn: () => fastapiClient.getWorkflowInbox(),
	});
}