'use server';

/**
 * @fileOverview An AI agent that suggests a chess move and provides a confidence level.
 *
 * - suggestMoveWithConfidence - A function that suggests a move and provides a confidence level.
 * - SuggestMoveWithConfidenceInput - The input type for the suggestMoveWithConfidence function.
 * - SuggestMoveWithConfidenceOutput - The return type for the suggestMoveWithConfidence function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMoveWithConfidenceInputSchema = z.object({
  boardStateFen: z
    .string()
    .describe('The current state of the chess board in Forsyth–Edwards Notation (FEN).'),
  engineMove: z.string().describe('The move suggested by the chess engine.'),
});
export type SuggestMoveWithConfidenceInput = z.infer<
  typeof SuggestMoveWithConfidenceInputSchema
>;

const SuggestMoveWithConfidenceOutputSchema = z.object({
  move: z.string().describe('The suggested chess move.'),
  confidence: z
    .number()
    .describe('The AI confidence level (0-1) for how good the move is.'),
  explanation: z
    .string()
    .describe('The AI explanation of why the move is good.'),
});
export type SuggestMoveWithConfidenceOutput = z.infer<
  typeof SuggestMoveWithConfidenceOutputSchema
>;

export async function suggestMoveWithConfidence(
  input: SuggestMoveWithConfidenceInput
): Promise<SuggestMoveWithConfidenceOutput> {
  return suggestMoveWithConfidenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMoveWithConfidencePrompt',
  input: {schema: SuggestMoveWithConfidenceInputSchema},
  output: {schema: SuggestMoveWithConfidenceOutputSchema},
  prompt: `You are an expert chess analyst. Given the current board state in FEN notation and a suggested move from a chess engine, you will provide a confidence level (0-1) for how good the move is and an explanation.

Board State (FEN): {{{boardStateFen}}}
Engine Suggested Move: {{{engineMove}}}

Provide your analysis, including the move, your confidence (as a number between 0 and 1) and your explanation.`,
});

const suggestMoveWithConfidenceFlow = ai.defineFlow(
  {
    name: 'suggestMoveWithConfidenceFlow',
    inputSchema: SuggestMoveWithConfidenceInputSchema,
    outputSchema: SuggestMoveWithConfidenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
