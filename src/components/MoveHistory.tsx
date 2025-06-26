"use client";

import React from 'react';
import type { Move } from 'chess.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface MoveHistoryProps {
  history: Move[];
  currentIndex: number;
}

export default function MoveHistory({ history, currentIndex }: MoveHistoryProps) {
  const movePairs = React.useMemo(() => {
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push([history[i], history[i + 1]]);
    }
    return pairs;
  }, [history]);

  return (
    <div className="flex flex-col flex-grow min-h-0">
      <h3 className="text-lg font-semibold mb-2 px-1">Move History</h3>
      <ScrollArea className="flex-grow rounded-md border">
        <div className="p-2">
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No moves yet.</p>
          ) : (
            <ol className="space-y-1">
              {movePairs.map((pair, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-x-2 rounded-md p-1">
                  <div className="text-right text-muted-foreground font-mono">{i + 1}.</div>
                  <div className={cn(
                    "font-medium rounded px-2 py-0.5 text-center transition-colors",
                    currentIndex === i * 2 + 1 && "bg-accent text-accent-foreground"
                    )}>
                    {pair[0]?.san}
                  </div>
                  <div className={cn(
                    "font-medium rounded px-2 py-0.5 text-center transition-colors",
                    currentIndex === i * 2 + 2 && "bg-accent text-accent-foreground"
                    )}>
                    {pair[1]?.san}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
