'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { AlertCircle, Ban, Loader2 } from 'lucide-react';

interface CancelTicketDialogProps {
  eventId: string;
  eventTitle: string;
}

export function CancelTicketDialog({ eventId, eventTitle }: CancelTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch refund preview
  const { data: refundData, isLoading } = useQuery({
    queryKey: ['refund-preview', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/refund-preview`);
      return res.data.data;
    },
    enabled: open, // Only fetch when dialog is open
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/events/${eventId}/register`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Registration cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel registration');
    },
  });

  const handleCancel = () => {
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2">
            <Ban className="w-4 h-4 mr-1.5" /> Cancel Ticket
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Cancel Ticket</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your registration for <strong className="text-white">{eventTitle}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Calculating refund...</p>
            </div>
          ) : refundData ? (
            <div className="space-y-4">
              {refundData.ticketPrice > 0 ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="space-y-1 w-full">
                      <p className="font-medium text-destructive">Cancellation & Refund Policy</p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ticket Price:</span>
                        <span>{refundData.ticketPrice.toFixed(2)} ETB</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cancellation Fee ({100 - refundData.refundPercentage}%):</span>
                        <span>-{(refundData.ticketPrice - refundData.refundAmount).toFixed(2)} ETB</span>
                      </div>
                      <div className="border-t border-destructive/20 my-2 pt-2 flex justify-between font-bold text-white">
                        <span>Total Refund Amount:</span>
                        <span className="text-green-500">{refundData.refundAmount.toFixed(2)} ETB</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your refund will be processed to your original payment method.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-md p-4 text-sm text-muted-foreground">
                  This is a free event. You can cancel your ticket at no cost.
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-destructive">Error loading refund details.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Keep Ticket
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={mutation.isPending || isLoading}>
            {mutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
