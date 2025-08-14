import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fastapiClient } from '@/integrations/fastapi/client';
import { useAuth } from '@/contexts/FastAPIAuthContext';

const ApprovalReview = () => {
  const { instanceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const stepToken = qs.get('step_token') || '';

  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to /auth with return_to
    if (!fastapiClient.isAuthenticated()) {
      const returnTo = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?return_to=${returnTo}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const [instDetails, setInstDetails] = useState<any>(null);
  const [destLocations, setDestLocations] = useState<any[]>([]);

  const currentStepRow = useMemo(() => {
    if (!instDetails || !Array.isArray(instDetails.history)) return null;
    const idx = Number(instDetails.current_step) || 0;
    return instDetails.history.find((h: any) => h.step_index === idx) || null;
  }, [instDetails]);

  const isReceivingFinance = !!(currentStepRow && currentStepRow.actor_type === 'finance_manager' && currentStepRow.scope === 'receiving');

  // If this approval is for receiving manager, load destination branch locations
  useEffect(() => {
    (async () => {
      if (!instanceId) return;
      try {
        const inst = await fastapiClient.getWorkflowInstance(instanceId);
        setInstDetails(inst);
        // Items already carry destination_location_id if any
        const destBranchId = inst?.transfer?.destination_branch_id;
        if (destBranchId) {
          const list: any = await fastapiClient.getLocationsByBranch(destBranchId);
          const items = Array.isArray(list?.items) ? list.items : (Array.isArray(list) ? list : []);
          setDestLocations(items);
        }
      } catch {}
    })();
  }, [instanceId]);

  const submit = async (action: 'approve' | 'reject') => {
    if (!instanceId) return;
    if (action === 'approve' && isReceivingFinance) {
      const items: any[] = Array.isArray(instDetails?.transfer?.items) ? instDetails.transfer.items : [];
      const missing = items.filter((it) => !it.destination_location_id);
      if (missing.length > 0) {
        toast({ title: 'Destination required', description: 'Please set destination location for all items.', variant: 'destructive' });
        return;
      }
    }
    setSubmitting(true);
    try {
      const items: any[] = Array.isArray(instDetails?.transfer?.items) ? instDetails.transfer.items : [];
      console.log('items', items);

      await fastapiClient.post(`/workflows/instances/${instanceId}/decision`, {
        step_index: Number(instDetails?.current_step) || 0,
        action,
        comment,
        step_token: stepToken,
        item_details: action === 'approve' && isReceivingFinance ? items : undefined,
        actor_id: user?.id,
      }); 
      toast({ title: 'Success', description: `Decision submitted: ${action}` });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit decision', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Approval Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>Instance: {instanceId}</div>
          <div>
            Step: {instDetails?.current_step ?? '-'}
            {currentStepRow ? ` - ${currentStepRow.actor_type} (${currentStepRow.scope})` : ''}
          </div>
          <div>Business Ref: {instDetails?.business_ref || '-'}</div>
          <div>Status: {instDetails?.status || '-'}</div>
          <div>Requester: {instDetails?.transfer?.requester?.display_name || instDetails?.transfer?.requester?.email || '-'}</div>
          <div>Created At: {instDetails?.transfer?.created_at ? new Date(instDetails.transfer.created_at).toLocaleString() : '-'}</div>
          <div>Source Branch: {instDetails?.transfer?.source_branch_name || '-'}</div>
          <div>Destination Branch: {instDetails?.transfer?.destination_branch_name || '-'}</div>
        </div>
        {Array.isArray(instDetails?.transfer?.items) && instDetails.transfer.items.length > 0 && (
          <div>
            <div className="mt-2 font-medium">Assets</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Barcode</th>
                    <th className="py-2">Name</th>
                    <th className="py-2 pl-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {instDetails.transfer.items.map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono">{it.barcode}</td>
                      <td className="py-2">{it.name}</td>
                      <td className="py-2 pl-3">
                        <select
                          className="w-full border rounded p-2"
                          value={it.destination_location_id || ''}
                          onChange={(e) => setInstDetails((prev: any) => ({ ...prev, transfer: { ...prev.transfer, items: prev.transfer.items.map((i: any) => i.id === it.id ? { ...i, destination_location_id: e.target.value } : i) } }))}
                          disabled={!isReceivingFinance}
                        >
                          <option value="">Select location</option>
                          {destLocations.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="comment">Comments</Label>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
        </div>
        <div className="flex gap-3">
          <Button
            disabled={
              submitting ||
              (isReceivingFinance && (Array.isArray(instDetails?.transfer?.items) && instDetails.transfer.items.some((it: any) => !it.destination_location_id)))
            }
            onClick={() => submit('approve')}
          >
            Approve
          </Button>
          <Button disabled={submitting} variant="destructive" onClick={() => submit('reject')}>Reject</Button>
          <Button disabled={submitting} variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
        {instDetails && (
          <div className="mt-6 space-y-4">
            {/* <div>
              <div className="font-medium">Approval Steps</div>
              <div className="mt-2 space-y-2">
                {Array.isArray(instDetails.expected) && instDetails.expected.map((s: any) => (
                  <div key={s.step_index} className="p-3 border rounded">
                    <div className="text-sm">
                      Step {s.step_index + 1}: {s.actor_type} ({s.scope})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected actors: {Array.isArray(s.actors) && s.actors.length > 0 ? s.actors.map((a: any) => a.email || a.id).join(', ') : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
            <div>
              <div className="font-medium">Approval History</div>
              <div className="mt-2 space-y-2">
                {Array.isArray(instDetails.history) && instDetails.history.length > 0 ? (
                  instDetails.history.map((h: any) => (
                    <div key={h.step_index} className="p-3 border rounded">
                      <div className="text-sm">
                        Step {h.step_index + 1}: {h.actor_type} ({h.scope})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.status} by {h.decided_by_name || h.decided_by || '-'} at {h.decided_at ? new Date(h.decided_at).toLocaleString() : '-'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No history yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ApprovalReview;