import { useEffect, useMemo, useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useUsersWithRoles } from '@/hooks/useUserAssignments';
import { fastapiClient } from '@/integrations/fastapi/client';
import { Button } from '@/components/ui/button';

export const BranchManagerAssignments = () => {
  const { data: branchesData = { items: [], total: 0 } } = useBranches();
  const branches = branchesData.items || [];
  const { data: users = [] } = useUsersWithRoles();
  const branchManagers = useMemo(() => users.filter(u => u.role === 'branch_manager'), [users]);
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, string | undefined> = {};
    branches.forEach(b => { init[b.id] = (b as any).branch_manager_id; });
    setSelected(init);
  }, [branches.length]);

  const handleSave = async (branchId: string) => {
    setSaving(branchId);
    try {
      await fastapiClient.put(`/locations/branches/${branchId}`, { branch_manager_id: selected[branchId] || null });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Branch Managers</h3>
      <div className="space-y-3">
        {branches.map((b) => (
          <div key={b.id} className="flex items-center gap-3">
            <div className="w-64">{b.name}</div>
            <select
              className="border rounded p-2"
              value={selected[b.id] || ''}
              onChange={(e) => setSelected(prev => ({ ...prev, [b.id]: e.target.value || undefined }))}
            >
              <option value="">Unassigned</option>
              {branchManagers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => handleSave(b.id)} disabled={saving === b.id}>Save</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

