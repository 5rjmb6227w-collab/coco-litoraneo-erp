/**
 * GreetingBanner - Saudação personalizada que aparece no Dashboard
 * 
 * Exibe uma saudação matinal/vespertina/noturna com dados resumidos.
 * Aparece uma vez por sessão e pode ser dispensada.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { X, Sparkles, Sun, Moon, Sunset } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GreetingBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Check session storage to see if greeting was already shown
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const key = `greeting_shown_${today}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown && user) {
      setVisible(true);
    }
  }, [user]);

  const { data: greeting, isLoading } = trpc.ai.getGreeting.useQuery(undefined, {
    enabled: visible && !dismissed,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleDismiss = () => {
    setDismissed(true);
    const today = new Date().toISOString().split('T')[0];
    sessionStorage.setItem(`greeting_shown_${today}`, 'true');
  };

  if (!visible || dismissed || isLoading || !greeting) return null;

  const hour = new Date().getHours();
  const TimeIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
  
  const colorMap: Record<string, string> = {
    green: 'from-emerald-50 to-green-50 border-emerald-200',
    blue: 'from-blue-50 to-sky-50 border-blue-200',
    yellow: 'from-yellow-50 to-amber-50 border-yellow-200',
    red: 'from-red-50 to-rose-50 border-red-200',
    purple: 'from-purple-50 to-pink-50 border-purple-200',
  };

  const textColorMap: Record<string, string> = {
    green: 'text-emerald-800',
    blue: 'text-blue-800',
    yellow: 'text-yellow-800',
    red: 'text-red-800',
    purple: 'text-purple-800',
  };

  const bgClass = colorMap[greeting.color || 'blue'] || colorMap.blue;
  const textClass = textColorMap[greeting.color || 'blue'] || textColorMap.blue;

  return (
    <div className={`relative rounded-lg border bg-gradient-to-r ${bgClass} p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500`}>
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-60 hover:opacity-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-white/60 ${textClass}`}>
          <TimeIcon className="h-6 w-6" />
        </div>
        <div className="flex-1 pr-8">
          <h3 className={`text-lg font-semibold ${textClass} flex items-center gap-2`}>
            {greeting.icon && <span>{greeting.icon}</span>}
            {greeting.title}
          </h3>
          <p className={`text-sm mt-1 ${textClass} opacity-80`}>
            {greeting.message}
          </p>
        </div>
        <Sparkles className={`h-5 w-5 ${textClass} opacity-40`} />
      </div>
    </div>
  );
}
