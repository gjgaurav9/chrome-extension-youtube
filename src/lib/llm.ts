import OpenAI from 'openai';
import type { MCQ } from './types';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = `You generate spaced-repetition review questions from YouTube video transcripts. Your job is to test whether the viewer understood and can apply the KEY IDEAS — not whether they remember trivia, names, or exact phrasing.

Rules:
1. Generate exactly 3 multiple-choice questions.
2. Each question has exactly 4 options, with exactly 1 correct answer.
3. Questions must test CONCEPTUAL UNDERSTANDING or APPLICATION, not recall of specific words from the transcript.
   - BAD: "What word did the speaker use to describe X?"
   - BAD: "In which minute did the speaker mention Y?"
   - GOOD: "According to the principle discussed, what would happen if you doubled the input?"
   - GOOD: "Which scenario best illustrates the main idea of the video?"
4. Distractors (wrong options) must be plausible — common misconceptions or adjacent ideas, not obviously silly.
5. Each question includes a 1-2 sentence explanation of why the correct answer is right.
6. Difficulty: aim for someone who watched the video attentively a week ago and is now reviewing.`;

// OpenAI Structured Outputs schema. With strict: true, the model is
// guaranteed to emit JSON matching this shape — no markdown fences,
// no extra fields, exact counts.
const QUESTIONS_SCHEMA = {
  name: 'questions',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'correctIndex', 'explanation'],
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export interface GenerateInput {
  apiKey: string;
  title: string;
  channel: string;
  transcript: string;
}

export async function generateQuestions(input: GenerateInput): Promise<MCQ[]> {
  const client = new OpenAI({
    apiKey: input.apiKey,
    dangerouslyAllowBrowser: true,
  });
  const userMessage = `Video title: ${input.title}\nChannel: ${input.channel}\n\nTranscript:\n${input.transcript}`;

  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: QUESTIONS_SCHEMA,
    },
  });

  const message = resp.choices[0]?.message;
  if (!message) throw new Error('Model returned no choice');
  if (message.refusal) throw new Error(`Model refused: ${message.refusal}`);
  if (!message.content) throw new Error('Model returned empty content');

  // Schema is strict — JSON.parse is safe and the shape is guaranteed.
  const parsed = JSON.parse(message.content) as { questions: MCQ[] };
  return parsed.questions;
}
