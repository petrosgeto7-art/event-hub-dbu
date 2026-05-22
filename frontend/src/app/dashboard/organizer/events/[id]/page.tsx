'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Calendar as CalendarIcon, MapPin, Eye, ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { UpdateStatusDialog } from './update-status-dialog';

export default function ManageEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}`);
      return res.data.data;
    },
  });

  const { data: registrationsData } = useQuery({
    queryKey: ['event-registrations', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}/registrations?limit=10`);
      return res.data.data;
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Loading event data...</div>;
  }

  if (!event) {
    return <div className="flex h-64 items-center justify-center">Event not found.</div>;
  }

  const isFree = !event.price || event.price === 0 || event.isFree;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <Button variant="ghost" className="mb-2 -ml-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {event.date ? format(new Date(event.date), 'MMMM d, yyyy') : 'TBD'} • {event.startTime}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.isOnline ? 'Online Event' : event.location}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status !== 'CANCELLED' && (
            <UpdateStatusDialog 
              eventId={event.id}
              currentStatus={event.status}
              currentDate={event.date}
              currentStartTime={event.startTime}
              currentEndTime={event.endTime}
            />
          )}
          <Link href={`/events/${event.slug || event.id}`}>
            <Button variant="outline">View Public Page</Button>
          </Link>
          <Link href="/dashboard/organizer/scanner">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <QrCode className="w-4 h-4 mr-2" /> Scanner
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registrations</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.registeredCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {event.capacity || 'unlimited'} capacity
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFree ? '0' : (event.registeredCount * event.price).toLocaleString()} ETB</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isFree ? 'Free event' : `Based on ${event.price} ETB per ticket`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Page Views</CardTitle>
            <Eye className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.viewCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total views on platform</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{event.status.toLowerCase()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current visibility</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Recent Attendees</CardTitle>
            <CardDescription>People who recently registered for your event.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            {registrationsData?.registrations?.length > 0 ? (
              <div className="divide-y divide-border border-t border-border mt-4">
                {registrationsData.registrations.map((reg: any) => (
                  <div key={reg.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {reg.user.firstName[0]}{reg.user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{reg.user.firstName} {reg.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{reg.user.studentId || reg.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.createdAt), 'MMM d, h:mm a')}</p>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                        reg.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-500' : 
                        reg.status === 'CANCELLED' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No attendees registered yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Description</h4>
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
            {event.tags && event.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-secondary rounded-md text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
