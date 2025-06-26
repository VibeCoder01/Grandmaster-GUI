"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
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
  const [hint, setHint] = useState<{ move: string } | null>(null);
  const { toast } = useToast();

  const getHint = async () => {
    setIsLoading(true);
    setHint(null);
    try {
      // Use a fixed depth of 3 for hints for a good balance of speed and quality.
      const engineMove = await getBestMove(fen, 3);
      if (!engineMove) {
        toast({
            variant: "destructive",
            title: "Game Over",
            description: "No moves available to analyze.",
        });
        setIsLoading(false);
        return;
      }
      setHint({ move: engineMove });
    } catch (error) {
      console.error("Failed to get engine hint:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch engine-powered hint.",
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
        Get Engine Hint
      </Button>
      <div className={cn("transition-opacity duration-500", hint ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden')}>
        {hint && (
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Engine Suggestion: <span className="text-accent font-mono">{hint.move}</span></CardTitle>
              <CardDescription>The local engine suggests this move after its analysis.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
