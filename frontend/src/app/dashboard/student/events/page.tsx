'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CancelTicketDialog } from './cancel-ticket-dialog';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, MapPin, ArrowRight, QrCode } from 'lucide-react';

export default function StudentEventsPage() {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const res = await api.get('/my/registrations');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground">All your registered and past events.</p>
        </div>
        <Link href="/events/discover">
          <Button>Discover More</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : registrations?.length === 0 ? (
        <div className="text-center py-24 bg-white/5 border border-white/10 rounded-2xl">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-medium mb-2">No registrations yet</h3>
          <p className="text-muted-foreground mb-6">You haven't registered for any events.</p>
          <Link href="/events/discover">
            <Button>Explore Events</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {registrations?.map((reg: any, i: number) => {
            const eventEndDate = new Date(reg.event.date);
            eventEndDate.setHours(23, 59, 59, 999);
            const isPast = eventEndDate < new Date();
            
            return (
              <motion.div key={reg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`overflow-hidden transition-all border-white/10 ${isPast ? 'opacity-70 bg-black/20' : 'bg-card/50 hover:bg-white/5'}`}>
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-64 h-40 sm:h-auto shrink-0 bg-muted relative">
                      {(() => {
                        const fallbackImages: Record<string, string> = {
                          'workshop': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=400&fit=crop',
                          'seminar': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=400&fit=crop',
                          'competition': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop',
                          'science-week': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=400&fit=crop',
                          'cultural': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop',
                          'sports': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop',
                          'training': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
                          'networking': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
                          'hackathon': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
                          'career-fair': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
                        };
                        const imgSrc = reg.event.bannerImage || fallbackImages[reg.event.category?.slug] || `https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop`;
                        return (
                          <img src={imgSrc} alt={reg.event.title} className="w-full h-full object-cover" />
                        );
                      })()}
                      {isPast && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                          <Badge variant="secondary" className="bg-black/80 text-white">Past Event</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                            {format(new Date(reg.event.date), 'MMM d, yyyy')}
                          </Badge>
                          <Badge className={
                            reg.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/20' : 
                            reg.status === 'WAITLISTED' ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/20' : 
                            'bg-red-500/20 text-red-500 hover:bg-red-500/20'
                          }>
                            {reg.status}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-xl mb-2">{reg.event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {reg.event.startTime} - {reg.event.endTime}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {reg.event.location || 'Online'}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-2 items-center">
                        {reg.status === 'CONFIRMED' && !isPast && (
                          <CancelTicketDialog eventId={reg.event.id} eventTitle={reg.event.title} />
                        )}
                        {reg.status === 'CONFIRMED' && (
                          <Button 
                            variant="default" 
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => setSelectedTicket(reg)}
                          >
                            <QrCode className="w-4 h-4 mr-2" /> View Ticket
                          </Button>
                        )}
                        {isPast && !!reg.attendance && (
                          <Link href={`/dashboard/student/events/${reg.event.id}/feedback`}>
                            <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                              Leave Feedback
                            </Button>
                          </Link>
                        )}
                        <Link href={`/events/${reg.event.id}`}>
                          <Button variant="secondary" className="bg-white/10 hover:bg-white/20">
                            View Details <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ticket Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-bold">{selectedTicket?.event.title}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-2">
              Present this QR code at the event entrance.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="bg-white p-4 rounded-xl border-4 border-primary/20 shadow-xl relative overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-sm"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-sm"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-sm"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-sm"></div>
              
              {selectedTicket?.qrCode ? (
                <img src={selectedTicket.qrCode} alt="Ticket QR Code" className="w-64 h-64 object-contain mix-blend-multiply" />
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-muted-foreground bg-gray-100 rounded-lg">
                  <QrCode className="w-12 h-12 mb-2 opacity-50" />
                  <span className="text-sm">QR Code not generated yet</span>
                </div>
              )}
            </div>
            
            <div className="w-full space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Date & Time</span>
                <span className="text-sm font-medium">
                  {selectedTicket?.event.date && format(new Date(selectedTicket.event.date), 'MMM d, yyyy')} • {selectedTicket?.event.startTime}
                </span>
              </div>
              <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Location</span>
                <span className="text-sm font-medium text-right max-w-[200px] truncate">
                  {selectedTicket?.event.location || 'Online Event'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" /> Status</span>
                <Badge className="bg-green-500/20 text-green-500">{selectedTicket?.status}</Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
