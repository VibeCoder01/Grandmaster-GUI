
"use client";

import type { Move } from 'chess.js';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import MoveHistory from './MoveHistory';
import GameControls from './GameControls';
import AiHint from './AiHint';
import { Badge } from '@/components/ui/badge';
import { Hourglass, Loader2, Settings } from 'lucide-react';
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
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';

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
  depth: number;
  onDepthChange: (depth: number) => void;
  isThinking: boolean;
  isPondering: boolean;
  consideredMove: string | null;
  requestBestMove: (fen: string, depth: number) => Promise<string | null>;
  isPonderingEnabled: boolean;
  onPonderingEnabledChange: (checked: boolean) => void;
  isPonderingAnimationEnabled: boolean;
  onPonderingAnimationEnabledChange: (checked: boolean) => void;
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
  setMoveHistoryIndex,
  depth,
  onDepthChange,
  isThinking,
  isPondering,
  consideredMove,
  requestBestMove,
  isPonderingEnabled,
  onPonderingEnabledChange,
  isPonderingAnimationEnabled,
  onPonderingAnimationEnabledChange,
}: SidePanelProps) {

  const TurnStatusDisplay = () => {
    if (isGameOver) {
      return null;
    }

    if (isThinking) {
      return (
        <div className={`flex items-center gap-1.5 text-muted-foreground`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs font-medium">
              Thinking...
              {consideredMove && <span className="font-mono ml-1">{consideredMove}</span>}
            </span>
        </div>
      );
    }
    
    if (isPondering) {
      return (
        <div className={`flex items-center gap-1.5 text-muted-foreground`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs font-medium">
              Pondering...
              {consideredMove && <span className="font-mono ml-1">{consideredMove}</span>}
            </span>
        </div>
      );
    }

    if (turn === 'w' && !isViewingHistory) {
        return (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hourglass className="h-3 w-3" />
                <span className="text-xs font-medium">Waiting...</span>
            </div>
        );
    }
    
    // Default case: Show whose turn it is
    const turnText = turn === 'w' ? "White's Turn" : "Black's Turn";
    return <Badge variant="outline">{turnText}</Badge>;
  }

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
                <DialogDescription>Configure the chess engine.</DialogDescription>
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
                            <SelectItem value="external" disabled>External UCI Engine (planned)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="depth">Look-ahead Depth</Label>
                    <div className="flex items-center gap-4 pt-2">
                        <Slider
                            id="depth"
                            min={1}
                            max={5}
                            step={1}
                            value={[depth]}
                            onValueChange={(value) => onDepthChange(value[0])}
                        />
                        <span className="font-mono text-lg w-4 text-center">{depth}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Higher values are stronger but can be very slow.</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="pondering-enabled">Enable Pondering</Label>
                        <p className="text-sm text-muted-foreground">
                            Allow engine to think on your turn.
                        </p>
                    </div>
                    <Switch
                        id="pondering-enabled"
                        checked={isPonderingEnabled}
                        onCheckedChange={onPonderingEnabledChange}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className={cn("space-y-1", !isPonderingEnabled && "opacity-50")}>
                        <Label htmlFor="pondering-animation-enabled">Animate Pondering</Label>
                        <p className="text-sm text-muted-foreground">
                           Show considered moves on the board.
                        </p>
                    </div>
                    <Switch
                        id="pondering-animation-enabled"
                        checked={isPonderingAnimationEnabled}
                        onCheckedChange={onPonderingAnimationEnabledChange}
                        disabled={!isPonderingEnabled}
                    />
                </div>
                <Separator />
                <div className='space-y-2 opacity-50'>
                    <Label htmlFor="engine-url">UCI Engine URL</Label>
                    <Input id="engine-url" placeholder="ws://localhost:8080" disabled />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex justify-between items-center text-sm h-5">
          <Badge variant={isGameOver ? "destructive" : "secondary"} className="capitalize">{status}</Badge>
          <div className="flex items-center gap-2">
            <TurnStatusDisplay />
          </div>
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
