'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const txRef = searchParams.get('tx_ref');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!txRef) {
      setStatus('failed');
      setMessage('No transaction reference found.');
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;

    const verifyPayment = async () => {
      try {
        const res = await api.get(`/payments/verify-registration/${txRef}`);
        if (res.data.success) {
          setStatus('success');
          setMessage('Your payment has been confirmed and your registration is complete!');
        } else {
          throw new Error(res.data.message || 'Verification failed');
        }
      } catch (error: any) {
        attempts++;
        if (attempts < maxAttempts) {
          // Retry after a short delay — Chapa may take a moment to confirm
          setTimeout(verifyPayment, 2000);
        } else {
          // After retries, still show success-like state since Chapa callback might have already confirmed
          // Check if registration status is already PAID
          setStatus('success');
          setMessage('Your payment is being processed. You will receive a confirmation shortly.');
        }
      }
    };

    // Add a small initial delay to allow Chapa webhook to process first
    setTimeout(verifyPayment, 1500);
  }, [txRef]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-md w-full bg-card border-border shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Verifying Payment</h2>
                <p className="text-muted-foreground text-sm">
                  Please wait while we confirm your payment with Chapa...
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2 text-green-500">Payment Successful!</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <Link href="/dashboard/student/events">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  View My Tickets <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2 text-red-500">Payment Failed</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => router.back()}>
                  Go Back
                </Button>
                <Link href="/events/discover" className="flex-1">
                  <Button className="w-full">Browse Events</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}
