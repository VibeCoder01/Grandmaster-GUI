'use server';

/**
 * @fileOverview An AI agent that finds the best chess move given a board state and a list of legal moves.
 *
 * - findBestMove - A function that finds the best chess move.
 * - FindBestMoveInput - The input type for the findBestMove function.
 * - FindBestMoveOutput - The return type for the findBestMove function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindBestMoveInputSchema = z.object({
  boardStateFen: z
    .string()
    .describe('The current state of the chess board in Forsyth–Edwards Notation (FEN).'),
  legalMoves: z.array(z.string()).describe('The list of legal moves in Standard Algebraic Notation (SAN).'),
});
export type FindBestMoveInput = z.infer<typeof FindBestMoveInputSchema>;

const FindBestMoveOutputSchema = z.object({
  bestMove: z.string().describe('The best move selected from the list of legal moves.'),
});
export type FindBestMoveOutput = z.infer<typeof FindBestMoveOutputSchema>;

export async function findBestMove(
  input: FindBestMoveInput
): Promise<FindBestMoveOutput> {
  return findBestMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findBestMovePrompt',
  input: {schema: FindBestMoveInputSchema},
  output: {schema: FindBestMoveOutputSchema},
  prompt: `You are a chess engine. Your task is to select the best move from a list of legal moves.
The current state of the board is provided in FEN notation. The player to move is determined by the FEN string.

Board State (FEN): {{{boardStateFen}}}
Legal Moves: {{#each legalMoves}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Analyze the position and select the best move from the list of legal moves based on the following strategic principles, in order of importance:

1.  **Captures:** Prioritize capturing an opponent's piece over other moves.
2.  **Develop Pieces Efficiently:** Develop knights and bishops from their starting squares early. Generally, knights before bishops.
3.  **King Safety:** Castle early (usually kingside) to safeguard your king and connect your rooks.
4.  **Pawn Structure:** Avoid creating weaknesses like doubled, isolated, or backward pawns. Aim for a solid pawn structure.
5.  **Control the Center:** Occupy or influence the central squares (e4, d4, e5, d5).

Based on these principles, choose the single best move from the provided list of legal moves and return it.
`,
});

const findBestMoveFlow = ai.defineFlow(
  {
    name: 'findBestMoveFlow',
    inputSchema: FindBestMoveInputSchema,
    outputSchema: FindBestMoveOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
