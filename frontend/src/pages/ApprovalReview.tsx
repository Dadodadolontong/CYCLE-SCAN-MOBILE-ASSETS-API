import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fastapiClient } from '@/integrations/fastapi/client';

const ApprovalReview = () => {
  const { instanceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const stepIndex = qs.get('step') || '0';
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

  const submit = async (action: 'approve' | 'reject') => {
    if (!instanceId) return;
    setSubmitting(true);
    try {
      await fastapiClient.post(`/workflows/instances/${instanceId}/decision`, {
        step_index: Number(stepIndex) || 0,
        action,
        comment,
        step_token: stepToken,
      });
      toast({ title: 'Success', description: `Decision submitted: ${action}` });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit decision', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Approval Review</h2>
        <div className="text-sm text-muted-foreground">Instance: {instanceId}</div>
        <div className="text-sm text-muted-foreground">Step: {stepIndex}</div>
        <div className="space-y-2">
          <Label htmlFor="comment">Comments</Label>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
        </div>
        <div className="flex gap-3">
          <Button disabled={submitting} onClick={() => submit('approve')}>Approve</Button>
          <Button disabled={submitting} variant="destructive" onClick={() => submit('reject')}>Reject</Button>
        </div>
      </Card>
    </div>
  );
};

export default ApprovalReview;