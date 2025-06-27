
"use client";

import type { Move, PieceSymbol } from 'chess.js';
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
import { Progress } from './ui/progress';
import PieceImage from './PieceImage';

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
  bestVariation: Move[] | null;
  isPonderingEnabled: boolean;
  onPonderingEnabledChange: (checked: boolean) => void;
  isPonderingAnimationEnabled: boolean;
  onPonderingAnimationEnabledChange: (checked: boolean) => void;
  progress: number;
  whiteTime: number;
  blackTime: number;
  timeControl: number;
  onTimeControlChange: (value: number) => void;
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  showLegalMoveDots: boolean;
  onShowLegalMoveDotsChange: (checked: boolean) => void;
  showLastMove: boolean;
  onShowLastMoveChange: (checked: boolean) => void;
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
  bestVariation,
  isPonderingEnabled,
  onPonderingEnabledChange,
  isPonderingAnimationEnabled,
  onPonderingAnimationEnabledChange,
  progress,
  whiteTime,
  blackTime,
  timeControl,
  onTimeControlChange,
  capturedByWhite,
  capturedByBlack,
  showLegalMoveDots,
  onShowLegalMoveDotsChange,
  showLastMove,
  onShowLastMoveChange,
}: SidePanelProps) {

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const TurnStatusDisplay = () => {
    if (isGameOver) {
      return null;
    }
    
    const variationString = bestVariation?.map(m => m.san).join(' ');

    if (isThinking) {
      return (
        <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-medium">Thinking...</span>
          </div>
          <Progress value={progress} className="h-1 w-full" />
          {variationString && (
            <p className="font-mono ml-[1.125rem] break-all leading-tight">
              {variationString}
            </p>
          )}
        </div>
      );
    }
    
    if (isPondering) {
       return (
        <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-medium">Pondering...</span>
          </div>
          <Progress value={progress} className="h-1 w-full" />
          {variationString && (
            <p className="font-mono ml-[1.125rem] break-all leading-tight">
              {variationString}
            </p>
          )}
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
                <DialogDescription>Configure the chess engine and game settings.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className='space-y-2'>
                    <Label htmlFor="time-control">Time Control</Label>
                    <Select value={timeControl.toString()} onValueChange={(v) => onTimeControlChange(parseInt(v, 10))}>
                        <SelectTrigger id="time-control">
                            <SelectValue placeholder="Select time control" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="300">5 Minutes</SelectItem>
                            <SelectItem value="600">10 Minutes</SelectItem>
                            <SelectItem value="900">15 Minutes</SelectItem>
                            <SelectItem value="1800">30 Minutes</SelectItem>
                            <SelectItem value="3600">60 Minutes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <Separator />
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
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="legal-move-dots">Show Legal Move Dots</Label>
                        <p className="text-sm text-muted-foreground">
                            Display dots for valid moves.
                        </p>
                    </div>
                    <Switch
                        id="legal-move-dots"
                        checked={showLegalMoveDots}
                        onCheckedChange={onShowLegalMoveDotsChange}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="last-move-indicator">Show Last Move</Label>
                        <p className="text-sm text-muted-foreground">
                            Highlight the previous move on the board.
                        </p>
                    </div>
                    <Switch
                        id="last-move-indicator"
                        checked={showLastMove}
                        onCheckedChange={onShowLastMoveChange}
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
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className={cn("p-2 rounded-lg bg-card text-card-foreground space-y-1", turn === 'w' && !isGameOver && "ring-2 ring-accent")}>
            <div className="flex justify-between items-center h-5">
              <div className="text-sm text-muted-foreground">White</div>
              <div className="flex flex-wrap gap-0.5 items-center justify-end">
                {capturedByWhite.map((p, i) => <PieceImage key={i} pieceType={p} color="b" />)}
              </div>
            </div>
            <div className="text-xl font-mono font-semibold">{formatTime(whiteTime)}</div>
          </div>
          <div className={cn("p-2 rounded-lg bg-card text-card-foreground space-y-1", turn === 'b' && !isGameOver && "ring-2 ring-accent")}>
            <div className="flex justify-between items-center h-5">
              <div className="text-sm text-muted-foreground">Black</div>
              <div className="flex flex-wrap gap-0.5 items-center justify-end">
                {capturedByBlack.map((p, i) => <PieceImage key={i} pieceType={p} color="w" />)}
              </div>
            </div>
            <div className="text-xl font-mono font-semibold">{formatTime(blackTime)}</div>
          </div>
        </div>
        <div className="flex justify-between items-start text-sm min-h-10">
          <div>
            {status !== 'In Progress' && (
              <Badge variant={isGameOver ? "destructive" : "secondary"} className="capitalize">{status}</Badge>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 flex-grow">
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
