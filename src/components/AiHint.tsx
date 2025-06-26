"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, Loader2 } from 'lucide-react';
import { suggestMoveWithConfidence, type SuggestMoveWithConfidenceOutput } from '@/ai/flows/suggest-move';
import { getBestMove } from '@/lib/engine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AiHintProps {
  fen: string;
  isGameOver: boolean;
  isViewingHistory: boolean;
}

export default function AiHint({ fen, isGameOver, isViewingHistory }: AiHintProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<SuggestMoveWithConfidenceOutput | null>(null);
  const { toast } = useToast();

  const getHint = async () => {
    setIsLoading(true);
    setHint(null);
    try {
      const engineMove = await getBestMove(fen);
      if (!engineMove) {
        toast({
            variant: "destructive",
            title: "Game Over",
            description: "No moves available to analyze.",
        });
        setIsLoading(false);
        return;
      }

      const aiResult = await suggestMoveWithConfidence({
        boardStateFen: fen,
        engineMove: engineMove,
      });
      setHint(aiResult);
    } catch (error) {
      console.error("Failed to get AI hint:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch AI-powered hint.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={getHint} disabled={isLoading || isGameOver || isViewingHistory} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent/50">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lightbulb className="mr-2 h-4 w-4" />
        )}
        Get AI Hint
      </Button>
      <div className={cn("transition-opacity duration-500", hint ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden')}>
        {hint && (
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis: <span className="text-accent font-mono">{hint.move}</span></CardTitle>
              <CardDescription>Engine suggestion: {hint.move}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Confidence</p>
                  <p className="text-sm font-bold text-accent">{(hint.confidence * 100).toFixed(0)}%</p>
                </div>
                <Progress value={hint.confidence * 100} className="w-full [&>*]:bg-accent" />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Explanation</p>
                <p className="text-sm text-muted-foreground">{hint.explanation}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
