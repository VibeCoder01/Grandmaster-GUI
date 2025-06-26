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
  prompt: `You are a chess grandmaster. Your task is to select the best move from a list of legal moves.
The current state of the board is provided in FEN notation. The player to move is determined by the FEN string.

Board State (FEN): {{{boardStateFen}}}
Legal Moves: {{#each legalMoves}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Analyze the position and select the best move from the list of legal moves based on the following strategic principles, in order of importance:

1.  **Tactics and Material:** This is the most important principle. Always look for tactical opportunities like checks, captures, threats, forks, pins, skewers, and discovered attacks. Prioritize moves that win material or create immediate threats to the opponent's pieces. After every move, ask: “What are all checks, captures, and threats available to both sides?”
2.  **King Safety:** A safe king is the foundation of any good position. Castle early (usually kingside) to safeguard your king and connect your rooks. Avoid leaving the king in the center or exposing it with reckless pawn pushes.
3.  **Develop Pieces Efficiently:** Develop knights and bishops from their starting squares early. Generally, knights before bishops. Avoid moving the same piece multiple times in the opening. Do not bring the queen out too early.
4.  **Control the Center:** Occupy or influence the central squares (e4, d4, e5, d5). This gives your pieces greater mobility and influence over the game.
5.  **Use All Your Pieces:** Bring every piece into the game. Don't let pieces sit idle on their starting squares. Place rooks on open or semi-open files where they can control key lines. Centralize your queen once initial threats are managed.
6.  **Pawn Structure:** Avoid creating weaknesses like doubled, isolated, or backward pawns unless there is clear compensation. Aim for a solid pawn structure that supports your pieces and creates potential for attack.
7.  **Plan Based on the Position:** Formulate a plan based on the pawn structure and piece placement. A good move should fit into a coherent plan. Consider common plans like a kingside attack (especially if the center is closed), a minority attack (using fewer pawns to create weaknesses), or a central break to open the position for your pieces.
8.  **Trade When Ahead, Avoid When Behind:** If you have a material advantage, seek to simplify the game by trading pieces (especially queens). This reduces your opponent's counter-attacking chances. If you are behind in material, avoid trades and seek to create complications.
9.  **King and Pawn Endgame Principles:** When few pieces remain, endgame knowledge is paramount.
    - **A. The Opposition:** The player who does not have to move when kings are facing each other holds the opposition.
        - *Rule:* If kings are on the same file with one empty square between them (e.g., White King on e4, Black King on e6), the player whose turn it is *not* has the opposition.
        - *Use:* Use the opposition to force the enemy king back and escort your own pawn to promotion.
    - **B. Rule of the Square:** A visual method to determine if a king can catch a passed pawn.
        - *Rule:* Imagine a square from the pawn's current location to its promotion rank, extending sideways to form a square. If the enemy king can step into this square on its move, it can catch the pawn. If not, the pawn will promote.
    - **C. Key Squares:** Critical squares that, if occupied by your king, guarantee the promotion of your pawn.
        - *For a pawn on ranks 2-4:* The key squares are the three squares two ranks ahead (e.g., for a pawn on e2, key squares are d4, e4, f4).
        - *For a pawn on rank 5 or higher:* The six squares in front and to the side of the pawn are key (e.g., for a pawn on e5, key squares are d6, e6, f6, d7, e7, f7). If your king can occupy any of these, you can typically force a win.
    - **D. King Activity and Position:** In the endgame, the king becomes a powerful attacking and defending piece.
        - *Winning Setup:* Your king should be in front of your pawn, controlling key squares and using the opposition.
        - *Losing Setup:* A lone king in front of an enemy pawn without support, or a pawn advanced too far without its king's help.
        - *General Rule:* Move your king towards the center of the board or towards the area of conflict.
10. **Always Have a Reason:** Don't play "hope chess" by making moves hoping your opponent blunders. Every move should have a purpose. Constantly ask, "What is my opponent threatening? What is my plan? How does my opponent respond to my plan?" and choose the move that best addresses these questions.

Based on a holistic evaluation of these principles, choose the single best move from the provided list of legal moves and return it.
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
