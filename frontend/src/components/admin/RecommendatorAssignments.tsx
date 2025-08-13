import { useEffect, useMemo, useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useCategories } from '@/hooks/useCategories';
import { useUsersWithRoles } from '@/hooks/useUserAssignments';
import { fastapiClient } from '@/integrations/fastapi/client';
import { Button } from '@/components/ui/button';

export const RecommendatorAssignments = () => {
  const { data: branchesData = { items: [], total: 0 } } = useBranches();
  const branches = branchesData.items || [];
  const countries = useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    branches.forEach(b => {
      const country = (b as any).country;
      if (country) map[country.id] = country;
    });
    return Object.values(map);
  }, [branches.length]);
  const { data: categories = [] } = useCategories();
  const { data: users = [] } = useUsersWithRoles();
  const recommendators = useMemo(() => users.filter(u => u.role === 'recommendator'), [users]);

  const [countryId, setCountryId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!countryId || !userId) return;
    setSaving(true);
    try {
      await fastapiClient.post('/user-assignments/country-recommendators', {
        country_id: countryId,
        category_id: categoryId || null,
        user_id: userId,
        active: true,
      });
      alert('Saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recommendators</h3>
      <div className="flex gap-3 items-center">
        <select className="border rounded p-2" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          <option value="">Select Country</option>
          {countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="border rounded p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Default (all categories)</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="border rounded p-2" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Select Recommendator</option>
          {recommendators.map(u => (
            <option key={u.id} value={u.id}>{u.display_name}</option>
          ))}
        </select>
        <Button onClick={handleSave} disabled={!countryId || !userId || saving}>Save</Button>
      </div>
    </div>
  );
};

