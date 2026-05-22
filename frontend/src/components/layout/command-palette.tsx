'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, Sparkles, Flame, Users, X, Command, Loader2, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setResults([]);
      setSelectedIndex(0);
      setAiResponse(null);
      setIsAskingAi(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch results from API
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    api.get(`/events?search=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then((res) => {
        if (!cancelled) {
          const events = res.data?.data?.events || (Array.isArray(res.data?.data) ? res.data.data : []);
          setResults(events);
          setSelectedIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Navigate to event
  const navigateToEvent = useCallback((eventId: string) => {
    setIsOpen(false);
    router.push(`/events/${eventId}`);
  }, [router]);

  // Navigate to discover with search
  const navigateToDiscover = useCallback((query: string) => {
    setIsOpen(false);
    router.push(`/events/discover?search=${encodeURIComponent(query)}`);
  }, [router]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length + suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2 && results.length > 0) {
        const selected = results[selectedIndex];
        if (selected) navigateToEvent(selected.id);
      } else if (searchQuery.length === 0 && selectedIndex < suggestions.length) {
        setSearchQuery(suggestions[selectedIndex].text);
      } else if (searchQuery.length >= 2) {
        // No results found — go to discover page with the search
        navigateToDiscover(searchQuery);
      }
    }
  };

  const handleAskAi = async () => {
    if (!searchQuery) return;
    setIsAskingAi(true);
    setAiResponse(null);
    try {
      const prompt = `You are a helpful AI assistant for EventHub DBU (Debre Berhan University). Keep your answer short (max 2 sentences). User asks: ${searchQuery}`;
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      const text = await response.text();
      setAiResponse(text);
    } catch (err) {
      setAiResponse("I'm having trouble connecting to my AI brain right now. Please try again.");
    } finally {
      setIsAskingAi(false);
    }
  };

  // AI-style quick suggestions
  const suggestions = [
    { icon: Flame, text: "hackathon", type: "ai" },
    { icon: Sparkles, text: "workshop", type: "ai" },
    { icon: Calendar, text: "seminar", type: "ai" },
    { icon: Users, text: "networking", type: "ai" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden pointer-events-auto"
              onKeyDown={handleKeyDown}
            >
              {/* Search Input Area */}
              <div className="flex items-center px-4 py-3 border-b border-border bg-background/50">
                <Sparkles className="w-5 h-5 text-primary mr-3 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search events by name, category, or keyword..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground text-lg placeholder:text-muted-foreground/60 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Suggestions / Results */}
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <div className="p-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      Quick search
                    </p>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors group ${
                          selectedIndex === i ? 'bg-secondary' : 'hover:bg-secondary'
                        }`}
                        onClick={() => setSearchQuery(s.text)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <s.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                          {s.text}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Searching events...</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-2">
                    {searchQuery.length >= 2 && (
                      <div className="p-3 mb-4 bg-primary/10 border border-primary/20 rounded-xl mx-2 mt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                            <Sparkles className="w-4 h-4" /> Ask EventHub AI
                          </h4>
                          {!aiResponse && !isAskingAi && (
                            <button onClick={handleAskAi} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md font-bold transition-colors">
                              Ask
                            </button>
                          )}
                        </div>
                        {isAskingAi && <div className="mt-2 text-sm text-primary flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Thinking...</div>}
                        {aiResponse && <div className="mt-2 text-sm text-foreground/90 leading-relaxed italic border-l-2 border-primary pl-3 py-1">{aiResponse}</div>}
                      </div>
                    )}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                      <Search className="w-3 h-3 text-primary" /> {results.length} result{results.length !== 1 ? 's' : ''} found
                    </p>
                    {results.map((event: any, i: number) => (
                      <button
                        key={event.id}
                        className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-left transition-colors group ${
                          selectedIndex === i ? 'bg-secondary' : 'hover:bg-secondary'
                        }`}
                        onClick={() => navigateToEvent(event.id)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">{event.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {event.category && (
                              <span className="bg-secondary px-1.5 py-0.5 rounded-md">
                                {event.category.icon} {event.category.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {event.date ? format(new Date(event.date), 'MMM d') : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {event.registeredCount || 0}/{event.capacity || 0}
                            </span>
                            <span className={(!event.price || event.price === 0 || event.isFree) ? 'text-green-500 font-semibold' : 'text-orange-500 font-semibold'}>
                              {(!event.price || event.price === 0 || event.isFree) ? 'FREE' : `${event.price} ETB`}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {/* Show "View all" link */}
                    <button
                      className="w-full mt-2 px-3 py-2 text-sm text-primary hover:bg-secondary rounded-xl transition-colors text-center font-medium"
                      onClick={() => navigateToDiscover(searchQuery)}
                    >
                      View all results for &quot;{searchQuery}&quot; →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    {searchQuery.length >= 2 && (
                      <div className="w-full px-4 mb-8">
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                              <Sparkles className="w-4 h-4" /> Ask EventHub AI
                            </h4>
                            {!aiResponse && !isAskingAi && (
                              <button onClick={handleAskAi} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md font-bold transition-colors">
                                Ask
                              </button>
                            )}
                          </div>
                          {isAskingAi && <div className="text-sm text-primary flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Thinking...</div>}
                          {aiResponse && <div className="text-sm text-foreground/90 leading-relaxed italic border-l-2 border-primary pl-3 py-1">{aiResponse}</div>}
                        </div>
                      </div>
                    )}
                    <Search className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No events found for &quot;{searchQuery}&quot;</p>
                    <p className="text-xs mt-1">Try a different keyword</p>
                    <button
                      className="mt-3 text-sm text-primary hover:underline"
                      onClick={() => navigateToDiscover(searchQuery)}
                    >
                      Browse all events →
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">↑↓</kbd> to navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">↵</kbd> to select</span>
                  <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">ESC</kbd> to close</span>
                </div>
                <div className="flex items-center gap-1">
                  Powered by <Sparkles className="w-3 h-3 text-primary" /> <span className="font-bold text-foreground">EventHub AI</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
