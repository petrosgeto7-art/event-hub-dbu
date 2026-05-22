'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface UpdateStatusDialogProps {
  eventId: string;
  currentStatus: string;
  currentDate: string;
  currentStartTime: string;
  currentEndTime: string;
}

export function UpdateStatusDialog({ eventId, currentStatus, currentDate, currentStartTime, currentEndTime }: UpdateStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<'CANCELLED' | 'POSTPONED'>('CANCELLED');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(currentDate ? new Date(currentDate).toISOString().split('T')[0] : '');
  const [startTime, setStartTime] = useState(currentStartTime || '');
  const [endTime, setEndTime] = useState(currentEndTime || '');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.patch(`/events/${eventId}/status`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success(statusAction === 'CANCELLED' ? 'Event Cancelled' : 'Event Postponed');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update event status');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 5) {
      toast.error('Please provide a message/apology of at least 5 characters.');
      return;
    }
    
    if (statusAction === 'POSTPONED' && (!date || !startTime || !endTime)) {
      toast.error('Please provide the new date and time details.');
      return;
    }

    const payload: any = {
      status: statusAction === 'POSTPONED' ? 'PUBLISHED' : 'CANCELLED',
      message
    };

    if (statusAction === 'POSTPONED') {
      payload.date = date;
      payload.startTime = startTime;
      payload.endTime = endTime;
    }

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" className="gap-2">
            <AlertTriangle className="w-4 h-4" /> Cancel / Postpone
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Cancel or Postpone Event</DialogTitle>
          <DialogDescription>
            Notify your attendees about changes. This will send an automated notification to all registered users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select value={statusAction} onValueChange={(val: any) => setStatusAction(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CANCELLED">Cancel Event</SelectItem>
                <SelectItem value="POSTPONED">Postpone Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {statusAction === 'POSTPONED' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Date</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Start Time</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New End Time</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Message to Attendees (Apology/Excuse)</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="We deeply apologize, but this event has been postponed due to..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Back</Button>
            <Button type="submit" variant={statusAction === 'CANCELLED' ? 'destructive' : 'default'} disabled={mutation.isPending}>
              {mutation.isPending ? 'Processing...' : `Confirm ${statusAction === 'CANCELLED' ? 'Cancellation' : 'Postponement'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
