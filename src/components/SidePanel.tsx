"use client";

import type { Move } from 'chess.js';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import MoveHistory from './MoveHistory';
import GameControls from './GameControls';
import AiHint from './AiHint';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

interface SidePanelProps {
  status: string;
  turn: 'w' | 'b';
  history: Move[];
  fen: string;
  isGameOver: boolean;
  isViewingHistory: boolean;
  moveHistoryIndex: number;
  resetGame: () => void;
  setMoveHistoryIndex: (index: number) => void;
}

export default function SidePanel({
  status,
  turn,
  history,
  fen,
  isGameOver,
  isViewingHistory,
  moveHistoryIndex,
  resetGame,
  setMoveHistoryIndex
}: SidePanelProps) {
  const turnText = turn === 'w' ? "White's Turn" : "Black's Turn";

  return (
    <Card className="w-full max-w-md lg:max-w-sm flex-shrink-0 self-center lg:self-stretch">
      <CardContent className="p-4 flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold font-headline text-primary">Grandmaster GUI</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon"><Settings/></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Engine Settings</DialogTitle>
                <DialogDescription>Configure the chess engine. External engine support is planned for a future release.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className='space-y-2'>
                    <Label htmlFor="engine-type">Engine Type</Label>
                    <Select defaultValue="internal" disabled>
                        <SelectTrigger id="engine-type">
                            <SelectValue placeholder="Select engine type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="internal">Internal Engine</SelectItem>
                            <SelectItem value="external">External UCI Engine</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="engine-url">UCI Engine URL</Label>
                    <Input id="engine-url" placeholder="ws://localhost:8080" disabled />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex justify-between items-center text-sm">
          <Badge variant={isGameOver ? "destructive" : "secondary"} className="capitalize">{status}</Badge>
          <Badge variant="outline">{turnText}</Badge>
        </div>
        <Separator />
        <AiHint fen={fen} isGameOver={isGameOver} isViewingHistory={isViewingHistory} />
        <Separator />
        <GameControls
          onReset={resetGame}
          onNavigate={setMoveHistoryIndex}
          historyLength={history.length}
          currentIndex={moveHistoryIndex}
        />
        <Separator />
        <MoveHistory history={history} currentIndex={moveHistoryIndex} />
      </CardContent>
    </Card>
  );
}
