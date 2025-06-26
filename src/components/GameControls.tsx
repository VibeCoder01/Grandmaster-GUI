"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Rewind, FastForward, ChevronLeft, ChevronRight, RotateCcw, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface GameControlsProps {
  onReset: () => void;
  onNavigate: (index: number) => void;
  historyLength: number;
  currentIndex: number;
}

export default function GameControls({ onReset, onNavigate, historyLength, currentIndex }: GameControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentIndex < historyLength) {
      interval = setInterval(() => {
        onNavigate(currentIndex + 1);
      }, 1000);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentIndex, historyLength, onNavigate]);

  const togglePlay = () => {
    if (currentIndex >= historyLength) {
      onNavigate(0);
    }
    setIsPlaying(prev => !prev);
  };
  
  const controlButtons = [
    { label: 'Go to Start', icon: Rewind, action: () => onNavigate(0), disabled: currentIndex === 0 },
    { label: 'Previous Move', icon: ChevronLeft, action: () => onNavigate(currentIndex - 1), disabled: currentIndex === 0 },
    { label: isPlaying ? 'Pause' : 'Play', icon: isPlaying ? Pause : Play, action: togglePlay, disabled: historyLength === 0 },
    { label: 'Next Move', icon: ChevronRight, action: () => onNavigate(currentIndex + 1), disabled: currentIndex === historyLength },
    { label: 'Go to End', icon: FastForward, action: () => onNavigate(historyLength), disabled: currentIndex === historyLength },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {controlButtons.map(({label, icon: Icon, action, disabled}) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={action} disabled={disabled}>
                  <Icon className={cn(label === 'Pause' && 'text-accent')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Button onClick={onReset} className="w-full" variant="secondary">
          <RotateCcw className="mr-2 h-4 w-4" /> New Game
        </Button>
      </div>
    </TooltipProvider>
  );
}
