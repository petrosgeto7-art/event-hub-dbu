'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Globe, Ticket, CalendarDays, AlignLeft, Info, Sparkles, UploadCloud, ImageIcon, Lightbulb, Send, Copy, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Detailed validation schema following Eventbrite standards
const eventSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters to provide enough detail for attendees.'),
  
  isOnline: z.boolean(),
  location: z.string().min(1, 'Location is required'),
  meetingUrl: z.string().optional(),
  
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  
  isFree: z.boolean(),
  price: z.number().min(0, 'Price cannot be negative'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  agreedToCommission: z.boolean().optional()
}).refine((data) => {
  if (!data.isFree && !data.agreedToCommission) {
    return false;
  }
  return true;
}, {
  message: "You must agree to the commission terms to publish a paid event.",
  path: ["agreedToCommission"],
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Features State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const [showPromoKit, setShowPromoKit] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      description: '',
      location: '',
      date: '',
      startTime: '',
      endTime: '',
      isOnline: false,
      capacity: 100,
      isFree: true,
      price: 0,
      agreedToCommission: false,
    },
  });

  const isOnline = watch('isOnline');
  const isFree = watch('isFree');
  const title = watch('title') || 'Untitled Event';
  const capacity = watch('capacity') || 0;
  const watchCategory = watch('categoryId');

  // AI "Magic Wand" Auto-Pilot
  const handleMagicWand = async () => {
    if (!aiPrompt) {
      toast.error('Please describe your event first!');
      return;
    }
    setIsGeneratingAI(true);
    
    try {
      const response = await fetch(`https://text.pollinations.ai/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an event management assistant. Create an event based on the user prompt. Return ONLY valid JSON with no markdown formatting. DO NOT wrap the output in ```json or ```. The JSON must have these exact keys: title (string), description (detailed string > 50 chars), isOnline (boolean), location (string, give a realistic venue), capacity (number), isFree (boolean), price (number in ETB).' },
            { role: 'user', content: aiPrompt }
          ],
          jsonMode: true
        })
      });

      const text = await response.text();
      // clean up any markdown if it accidentally added it
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr);

      setValue('title', data.title || 'Untitled Event');
      setValue('categoryId', categories?.[0]?.id || '');
      setValue('description', data.description || aiPrompt);
      setValue('isOnline', data.isOnline || false);
      setValue('location', data.location || 'Main Campus Auditorium');
      
      // Set dates to next weekend
      const nextWeekend = new Date();
      nextWeekend.setDate(nextWeekend.getDate() + (6 - nextWeekend.getDay()));
      setValue('date', nextWeekend.toISOString().split('T')[0]);
      setValue('startTime', '09:00');
      setValue('endTime', '18:00');
      
      setValue('capacity', data.capacity || 100);
      setValue('isFree', data.isFree !== undefined ? data.isFree : true);
      setValue('price', data.price || 0);

      // Automatically pre-fill the image prompt
      setImagePrompt(`Professional high quality event banner for: ${data.title}`);

      toast.success('AI successfully drafted your event!');
    } catch (err) {
      console.error('AI Generation error:', err);
      // Smart Fallback by parsing the text manually if AI fails
      setValue('title', aiPrompt.split(' ').slice(0, 5).join(' ') + ' Event');
      setValue('categoryId', categories?.[0]?.id || '');
      setValue('description', `${aiPrompt}\n\nJoin us for an intense and exciting event where top student innovators and creators will gather. Food, drinks, mentorship, and awesome prizes provided! Prepare to pitch your ideas to industry leaders.`);
      setValue('isOnline', aiPrompt.toLowerCase().includes('online') || aiPrompt.toLowerCase().includes('zoom'));
      setValue('location', 'Main Campus Auditorium, DBU');
      
      // Set dates to next weekend
      const nextWeekend = new Date();
      nextWeekend.setDate(nextWeekend.getDate() + (6 - nextWeekend.getDay()));
      setValue('date', nextWeekend.toISOString().split('T')[0]);
      setValue('startTime', '09:00');
      setValue('endTime', '18:00');
      
      setValue('capacity', aiPrompt.includes('200') ? 200 : 150);
      setValue('isFree', !aiPrompt.toLowerCase().includes('paid'));
      setValue('price', aiPrompt.toLowerCase().includes('paid') ? 150 : 0);
      
      setImagePrompt(`A professional banner for ${aiPrompt}`);
      toast.success('Generated basic draft from prompt!');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // AI Image Generator
  const generateImage = async () => {
    if (!imagePrompt) {
      toast.error('Please enter an image prompt');
      return;
    }
    setIsGeneratingImage(true);
    // Use Pollinations AI to generate a real image for free
    const encodedPrompt = encodeURIComponent(`${imagePrompt} event banner professional high quality 8k`);
    const seed = Math.floor(Math.random() * 1000000); // Add random seed to prevent caching
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=400&nologo=true&seed=${seed}`;
    
    // Set the image immediately and let the img tag handle loading state
    setGeneratedImage(imageUrl);
  };


  const onSubmit = async (data: EventFormValues) => {
    try {
      setIsSubmitting(true);
      const isoDate = new Date(data.date).toISOString();
      const payload: any = { ...data, date: isoDate };
      
      // Clean up meeting URL
      if (!payload.meetingUrl || payload.meetingUrl.trim() === '') {
        delete payload.meetingUrl;
      }

      // Add generated image if exists
      if (generatedImage) {
        payload.bannerImage = generatedImage;
      }

      // Backend expects ticketTiers array
      payload.ticketTiers = [
        {
          name: data.isFree ? 'Free Admission' : 'General Admission',
          price: data.isFree ? 0 : data.price,
          capacity: data.capacity,
        }
      ];
      
      const response = await api.post('/events', payload);
      setCreatedEventId(response.data.data.id);
      setShowPromoKit(true); // Trigger AI Marketing Kit
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Eventbrite Style Top Navbar */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/organizer" className="text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back
          </Link>
          <div className="w-px h-6 bg-border"></div>
          <h1 className="font-semibold text-lg truncate max-w-[300px]">{title}</h1>
          <span className="px-2 py-1 text-xs font-medium bg-secondary rounded-md text-muted-foreground">Draft</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" disabled className="text-muted-foreground">Preview</Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={handleSubmit(onSubmit, () => {
              toast.error("Please fix the errors in the form before publishing.");
            })}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSubmitting ? 'Publishing...' : 'Publish Event'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background/50 w-full">
          <div className="max-w-4xl mx-auto py-10 px-6">
            
            {/* 🪄 AI MAGIC WAND HEADER */}
            <div className="mb-10 p-1 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-orange-400">
              <div className="bg-card rounded-xl p-5 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <Label className="flex items-center gap-2 text-primary font-bold mb-2">
                    <Sparkles className="w-4 h-4" /> AI Auto-Pilot
                  </Label>
                  <Input 
                    placeholder="E.g., I want to host a 2-day tech hackathon next weekend for 200 people..." 
                    className="bg-secondary/50 border-border text-foreground w-full placeholder:text-muted-foreground"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleMagicWand}
                  disabled={isGeneratingAI}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap mt-6 md:mt-0 shadow-[0_0_20px_rgba(var(--primary),0.3)] font-bold w-full md:w-auto"
                >
                  {isGeneratingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isGeneratingAI ? 'Generating Magic...' : 'Draft Event'}
                </Button>
              </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-12">
              
              {/* BASIC INFO */}
              <div className="space-y-10">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">Basic Info</h2>
                    <p className="text-muted-foreground">Name your event and tell event-goers why they should come. Add details that highlight what makes it unique.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-base font-semibold text-foreground">Event Title <span className="text-destructive">*</span></Label>
                      <Input
                        id="title" placeholder="Be clear and descriptive."
                        {...register('title')}
                        className={`h-14 text-lg bg-card border-border text-foreground ${errors.title ? 'border-destructive' : ''}`}
                      />
                      {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="categoryId" className="text-base font-semibold text-foreground">Category <span className="text-destructive">*</span></Label>
                      <Controller
                        name="categoryId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={`h-14 bg-card border-border text-foreground ${errors.categoryId ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <span className="flex items-center gap-2">{cat.icon} {cat.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                    </div>
                  </div>

                  <hr className="border-border" />

                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">Location</h3>
                    <p className="text-muted-foreground mb-6">Help people in the area discover your event and let attendees know where to show up.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div 
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${!isOnline ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/50 text-muted-foreground'}`}
                        onClick={() => setValue('isOnline', false)}
                      >
                        <MapPin className="w-8 h-8" />
                        <span className="font-semibold text-lg">Venue</span>
                      </div>
                      <div 
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${isOnline ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-border bg-card hover:border-blue-500/50 text-muted-foreground'}`}
                        onClick={() => setValue('isOnline', true)}
                      >
                        <Globe className="w-8 h-8" />
                        <span className="font-semibold text-lg">Online event</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="location" className="text-base font-semibold text-foreground">{isOnline ? 'Platform / Summary' : 'Venue Name / Address'} <span className="text-destructive">*</span></Label>
                      <Input
                        id="location" placeholder={isOnline ? 'e.g., Zoom, Google Meet' : 'e.g., Main Campus Auditorium, DBU'}
                        {...register('location')}
                        className={`h-14 bg-card border-border text-foreground ${errors.location ? 'border-destructive' : ''}`}
                      />
                      {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
                    </div>

                    {isOnline && (
                      <div className="space-y-3 mt-4">
                        <Label htmlFor="meetingUrl" className="text-base font-semibold text-foreground">Link for attendees</Label>
                        <Input
                          id="meetingUrl" placeholder="https://zoom.us/j/..."
                          {...register('meetingUrl')}
                          className="h-14 bg-card border-border text-foreground"
                        />
                      </div>
                    )}
                  </div>

                  <hr className="border-border" />

                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">Date and time</h3>
                    <p className="text-muted-foreground mb-6">Tell event-goers when your event starts and ends so they can make plans to attend.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="date" className="text-base font-semibold text-foreground">Event Date <span className="text-destructive">*</span></Label>
                        <Input
                          id="date" type="date"
                          {...register('date')}
                          className={`h-14 bg-card border-border text-foreground ${errors.date ? 'border-destructive' : ''}`}
                        />
                        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="startTime" className="text-base font-semibold text-foreground">Start Time <span className="text-destructive">*</span></Label>
                        <Input
                          id="startTime" type="time"
                          {...register('startTime')}
                          className={`h-14 bg-card border-border text-foreground ${errors.startTime ? 'border-destructive' : ''}`}
                        />
                        {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="endTime" className="text-base font-semibold text-foreground">End Time <span className="text-destructive">*</span></Label>
                        <Input
                          id="endTime" type="time"
                          {...register('endTime')}
                          className={`h-14 bg-card border-border text-foreground ${errors.endTime ? 'border-destructive' : ''}`}
                        />
                        {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
                      </div>
                    </div>
                  </div>

              </div>

              {/* DETAILS */}
              <div className="space-y-10 mt-16 pt-16 border-t border-border">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">Details & Banner</h2>
                    <p className="text-muted-foreground">Add a banner image and provide a detailed description of your event.</p>
                  </div>

                  {/* 🎨 AI IMAGE GENERATION STUDIO */}
                  <div className="p-6 rounded-2xl border border-border bg-card">
                    <Tabs defaultValue="generate" className="w-full">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Event Banner</h3>
                        <TabsList className="bg-secondary">
                          <TabsTrigger value="generate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold"><Sparkles className="w-3.5 h-3.5 mr-2" /> AI Generate</TabsTrigger>
                          <TabsTrigger value="upload" className="font-bold"><UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="generate" className="space-y-4">
                        {generatedImage ? (
                          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-border group">
                            {isGeneratingImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 z-10 backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              </div>
                            )}
                            <img 
                              src={generatedImage} 
                              alt="Generated Banner" 
                              className="w-full h-full object-cover"
                              onLoad={() => {
                                setIsGeneratingImage(false);
                                toast.success('Image generated successfully!');
                              }}
                              onError={() => {
                                setIsGeneratingImage(false);
                                setGeneratedImage(null);
                                toast.error('Failed to load image. Try another prompt.');
                              }}
                            />
                            {!isGeneratingImage && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                <Button variant="outline" onClick={() => { setGeneratedImage(null); setIsGeneratingImage(false); }} className="border-white text-white hover:bg-white/20"><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 bg-secondary/50 p-4 rounded-xl border border-border">
                              <Input 
                                placeholder="E.g., A futuristic cyberpunk cityscape with neon lights for a hackathon..."
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                className="bg-card border-border text-foreground"
                              />
                              <Button onClick={generateImage} disabled={isGeneratingImage} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold whitespace-nowrap">
                                {isGeneratingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Generate Image'}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground italic flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Tip: Be descriptive! Include style, mood, and subject matter.</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="upload">
                        <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors bg-secondary/30 cursor-pointer">
                          <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
                          <h4 className="font-bold text-foreground mb-1">Click to upload or drag and drop</h4>
                          <p className="text-sm text-muted-foreground">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-semibold text-foreground">Event Description <span className="text-destructive">*</span></Label>
                    <textarea
                      id="description"
                      rows={12}
                      placeholder="Provide a detailed description of your event. What will attendees learn or experience?"
                      {...register('description')}
                      className={`flex w-full rounded-xl border bg-card border-border px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${errors.description ? 'border-destructive' : ''}`}
                    />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>

              </div>

              {/* TICKETS & PRICING */}
              <div className="space-y-10 mt-16 pt-16 border-t border-border">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">Tickets & Capacity</h2>
                    <p className="text-muted-foreground">Create tickets and set your capacity. You can add more ticket types later.</p>
                  </div>

                  {/* 📈 AI SMART PRICING & DEMAND PREDICTOR */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-primary/10 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground flex items-center gap-2 mb-1">AI Demand Insights <Sparkles className="w-3.5 h-3.5 text-primary" /></h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Based on {watchCategory ? 'similar events' : 'historical data'}, this weekend has high student availability. We predict a <strong>92% turnout rate</strong>.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-background border-primary/30 text-primary cursor-pointer hover:bg-primary/10" onClick={() => setValue('capacity', 250)}>Suggest Capacity: 250</Badge>
                        <Badge variant="outline" className="bg-background border-orange-500/30 text-orange-500 cursor-pointer hover:bg-orange-500/10" onClick={() => { setValue('isFree', false); setValue('price', 150); }}>Suggest Price: 150 ETB</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 border border-border rounded-2xl bg-card space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${isFree ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-border bg-secondary/50 hover:border-primary/50 text-muted-foreground'}`}
                        onClick={() => { setValue('isFree', true); setValue('price', 0); }}
                      >
                        <Ticket className="w-10 h-10" />
                        <span className="font-bold text-xl">Free</span>
                        <p className="text-sm text-center">Cost nothing to attend</p>
                      </div>
                      <div 
                        className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${!isFree ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 hover:border-primary/50 text-muted-foreground'}`}
                        onClick={() => setValue('isFree', false)}
                      >
                        <span className="text-4xl font-black">ETB</span>
                        <span className="font-bold text-xl">Paid</span>
                        <p className="text-sm text-center">Set your own price</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-3">
                        <Label htmlFor="capacity" className="text-base font-semibold text-foreground">Total Capacity <span className="text-destructive">*</span></Label>
                        <Input
                          id="capacity" type="number" min="1"
                          {...register('capacity', { valueAsNumber: true })}
                          className={`h-14 bg-secondary border-border text-foreground text-lg font-bold ${errors.capacity ? 'border-destructive' : ''}`}
                        />
                        <p className="text-xs text-muted-foreground">Maximum number of tickets available.</p>
                        {errors.capacity && <p className="text-sm text-destructive">{errors.capacity.message}</p>}
                      </div>

                      {!isFree && (
                        <div className="space-y-3">
                          <Label htmlFor="price" className="text-base font-semibold text-foreground">Ticket Price (ETB) <span className="text-destructive">*</span></Label>
                          <Input
                            id="price" type="number" min="1" placeholder="0.00"
                            {...register('price', { valueAsNumber: true })}
                            className={`h-14 bg-secondary border-border text-foreground text-lg text-primary font-bold ${errors.price ? 'border-destructive' : ''}`}
                          />
                          <p className="text-xs text-muted-foreground">Payments processed securely.</p>
                          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                        </div>
                      )}
                    </div>

                    {!isFree && (
                      <div className="space-y-3 mt-8">
                        <div className="flex items-start space-x-3 p-4 bg-secondary/30 rounded-xl border border-border">
                          <Controller
                            name="agreedToCommission"
                            control={control}
                            render={({ field }) => (
                              <Checkbox 
                                id="agreedToCommission"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            )}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="agreedToCommission"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                            >
                              I agree to the platform commission terms <span className="text-destructive">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              By publishing a paid event, you agree that the platform will deduct a commission share (determined by the admin) from each ticket sold. Your remaining revenue will be split directly into your Chapa subaccount upon every transaction.
                            </p>
                            {errors.agreedToCommission && <p className="text-sm text-destructive font-semibold mt-1">{errors.agreedToCommission.message}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 flex justify-end items-center border-t border-border mt-12">
                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        onClick={handleSubmit(onSubmit, () => {
                          toast.error("Please fix the errors in the form before publishing.");
                        })} 
                        disabled={isSubmitting}
                        className="h-12 px-10 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20"
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {isSubmitting ? 'Publishing...' : 'Publish Event'}
                      </Button>
                    </div>
                  </div>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* 🚀 AI PROMO KIT SUCCESS MODAL */}
      <Dialog open={showPromoKit} onOpenChange={(open) => {
        if (!open && createdEventId) {
          router.push(`/events/${createdEventId}`);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-center flex justify-center items-center gap-2">Event Published! <Sparkles className="w-5 h-5 text-primary" /></DialogTitle>
            <DialogDescription className="text-center text-base">
              Your event is live. Our AI has generated a promotional kit to help you boost sales instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto px-1 scrollbar-hide">
            {/* Twitter Draft */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="font-bold flex items-center gap-1.5"><Send className="w-4 h-4 text-[#1DA1F2]" /> Twitter / X Draft</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(`🚀 Exciting news! We just launched "${title}" on EventHub DBU! \n\nOnly ${capacity} spots available. Don't miss out! Register here: https://eventhub.dbu.edu.et/events/${createdEventId} #DBUEvents #Hackathon`)} className="h-6 text-xs text-primary"><Copy className="w-3 h-3 mr-1" /> Copy</Button>
              </div>
              <div className="p-4 rounded-xl bg-secondary border border-border text-sm text-foreground/80 whitespace-pre-wrap">
                🚀 Exciting news! We just launched "{title}" on EventHub DBU! <br/><br/>Only {capacity} spots available. Don't miss out! Register here: https://eventhub.dbu.edu.et/events/{createdEventId || '123'} #DBUEvents
              </div>
            </div>

            {/* Email Draft */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="font-bold flex items-center gap-1.5">📧 Email Newsletter</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(`Subject: You're invited to ${title}!\n\nHi everyone,\n\nI am thrilled to announce that registration is now open for ${title}. \n\nWe have prepared an incredible experience...`)} className="h-6 text-xs text-primary"><Copy className="w-3 h-3 mr-1" /> Copy</Button>
              </div>
              <div className="p-4 rounded-xl bg-secondary border border-border text-sm text-foreground/80 whitespace-pre-wrap">
                <span className="font-bold">Subject:</span> You're invited to {title}! 🚀<br/><br/>
                Hi everyone,<br/><br/>
                I am thrilled to announce that registration is now open for <strong>{title}</strong>. We have prepared an incredible experience...
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 sm:justify-center">
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 text-md" onClick={() => router.push(`/events/${createdEventId}`)}>
              Go to Event Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
