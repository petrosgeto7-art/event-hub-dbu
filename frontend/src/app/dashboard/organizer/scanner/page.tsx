'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Loader2, QrCode, AlertTriangle } from 'lucide-react';

export default function ScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ status: 'success' | 'error', message: string, user?: any } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { data: myEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['my-created-events'],
    queryFn: async () => {
      const res = await api.get('/events/my/events');
      // Only show events that are today or upcoming (simplified for MVP)
      return res.data.data;
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const res = await api.post('/attendance/scan', { eventId: selectedEventId, qrToken });
      return res.data;
    },
    onSuccess: (data) => {
      // Play success sound
      const audio = new Audio('/success.mp3');
      audio.play().catch(() => {});
      
      setLastScanResult({
        status: 'success',
        message: 'Checked in successfully!',
        user: data.data.user
      });
      toast.success('Attendee checked in successfully');
    },
    onError: (error: any) => {
      // Play error sound
      const audio = new Audio('/error.mp3');
      audio.play().catch(() => {});
      
      setLastScanResult({
        status: 'error',
        message: error.response?.data?.message || 'Invalid QR code'
      });
      toast.error(error.response?.data?.message || 'Failed to verify attendance');
    }
  });

  useEffect(() => {
    let scanner = scannerRef.current;
    
    if (isScanning && selectedEventId) {
      const newScanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 30, 
          qrbox: { width: 250, height: 250 },
          videoConstraints: { facingMode: "environment" },
          rememberLastUsedCamera: true
        },
        false
      );
      scannerRef.current = newScanner;

      newScanner.render(
        (decodedText) => {
          // Pause scanning temporarily while processing
          newScanner.pause(true);
          
          let tokenToVerify = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.token) tokenToVerify = parsed.token;
          } catch (e) {
            // Fallback
          }
          
          scanMutation.mutate(tokenToVerify, {
            onSettled: () => {
              setTimeout(() => {
                try { newScanner.resume(); } catch (e) {}
              }, 800);
            }
          });
        },
        () => {}
      );
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (error) {
          // Ignore clear errors on unmount
        }
      }
    };
  }, [isScanning, selectedEventId]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Scanner</h1>
        <p className="text-muted-foreground">Scan student QR passes to record attendance.</p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>Choose the event you are scanning for right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={selectedEventId} onValueChange={(val) => {
            setSelectedEventId(val as string);
            setIsScanning(false); // Reset scanner if event changes
            setLastScanResult(null);
          }}>
            <SelectTrigger className="bg-white/5 border-white/10 w-full md:w-[400px]">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {eventsLoading ? (
                <div className="p-2 text-sm text-muted-foreground">Loading events...</div>
              ) : myEvents?.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No active events found.</div>
              ) : (
                myEvents?.map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {selectedEventId && (
            <Button 
              onClick={() => setIsScanning(!isScanning)} 
              variant={isScanning ? "destructive" : "default"}
              className="w-full md:w-auto"
            >
              {isScanning ? 'Stop Scanning' : 'Start Camera Scanner'}
            </Button>
          )}
        </CardContent>
      </Card>

      {isScanning && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-black/50 border-white/10 overflow-hidden">
            <div id="reader" className="w-full" />
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Scan Result</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
              {scanMutation.isPending ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Verifying ticket...</p>
                </div>
              ) : lastScanResult ? (
                <div className={`flex flex-col items-center ${
                  lastScanResult.status === 'success' ? 'text-green-500' : 
                  lastScanResult.message === 'Attendance already recorded' ? 'text-orange-500' : 
                  'text-destructive'
                }`}>
                  {lastScanResult.status === 'success' ? (
                    <CheckCircle2 className="w-20 h-20 mb-4" />
                  ) : lastScanResult.message === 'Attendance already recorded' ? (
                    <AlertTriangle className="w-20 h-20 mb-4" />
                  ) : (
                    <XCircle className="w-20 h-20 mb-4" />
                  )}
                  <h3 className="text-2xl font-bold mb-2">
                    {lastScanResult.status === 'success' ? 'Access Granted' : lastScanResult.message}
                  </h3>
                  {lastScanResult.status === 'success' && (
                    <p className="text-green-400 font-bold mb-6 text-sm tracking-widest uppercase">TICKET VALIDATED</p>
                  )}
                  {lastScanResult.message === 'Attendance already recorded' && (
                    <p className="text-orange-400 font-bold mb-6 text-sm tracking-widest uppercase">ALREADY SCANNED</p>
                  )}
                  {lastScanResult.message === 'This event has already ended.' && (
                    <p className="text-red-500 font-bold mb-6 text-sm tracking-widest uppercase">EXPIRED TICKET</p>
                  )}
                  {lastScanResult.message === 'Ticket scanning opens 15 minutes before the event starts.' && (
                    <p className="text-yellow-500 font-bold mb-6 text-sm tracking-widest uppercase">TOO EARLY (WAIT)</p>
                  )}
                  {lastScanResult.message === 'This ticket is for a different event!' && (
                    <p className="text-red-500 font-bold mb-6 text-sm tracking-widest uppercase">WRONG EVENT</p>
                  )}
                  {lastScanResult.message === 'Registration is not confirmed' && (
                    <p className="text-red-500 font-bold mb-6 text-sm tracking-widest uppercase">NOT CONFIRMED</p>
                  )}
                  {lastScanResult.status === 'error' && 
                   !['Attendance already recorded', 'This event has already ended.', 'Ticket scanning opens 15 minutes before the event starts.', 'This ticket is for a different event!', 'Registration is not confirmed'].includes(lastScanResult.message) && (
                    <p className="text-red-500 font-bold mb-6 text-sm tracking-widest uppercase">ACCESS DENIED</p>
                  )}
                  
                  {lastScanResult.user && (
                    <div className="bg-muted p-4 rounded-xl w-full border border-border mt-4 flex justify-between items-center text-left">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Attendee Name</p>
                        <p className="font-bold text-foreground text-xl">{lastScanResult.user.firstName} {lastScanResult.user.lastName}</p>
                        <p className="text-sm text-muted-foreground">{lastScanResult.user.studentId || 'Student'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                         <p className="font-bold text-primary text-xl">1 Ticket</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <QrCode className="w-16 h-16 mb-4 opacity-50" />
                  <p>Point camera at a student's QR pass.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
