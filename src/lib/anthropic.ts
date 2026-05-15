import Anthropic from '@anthropic-ai/sdk';
import type { MCQ } from './types';

const MODEL = 'claude-haiku-4-5-20251001';
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
6. Difficulty: aim for someone who watched the video attentively a week ago and is now reviewing.

Return ONLY valid JSON in this exact shape, no preamble, no markdown fences:

{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`;

export interface GenerateInput {
  apiKey: string;
  title: string;
  channel: string;
  transcript: string;
}

export async function generateQuestions(input: GenerateInput): Promise<MCQ[]> {
  const client = new Anthropic({
    apiKey: input.apiKey,
    dangerouslyAllowBrowser: true,
  });
  const userMessage = `Video title: ${input.title}\nChannel: ${input.channel}\n\nTranscript:\n${input.transcript}`;

  async function callOnce(temperature: number): Promise<MCQ[]> {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const textBlock = resp.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Model returned no text content');
    }
    return parseAndValidate(textBlock.text);
  }

  try {
    return await callOnce(0.4);
  } catch (first) {
    try {
      return await callOnce(0.2);
    } catch (second) {
      const fm = first instanceof Error ? first.message : String(first);
      const sm = second instanceof Error ? second.message : String(second);
      throw new Error(`Question generation failed twice. First: ${fm}. Second: ${sm}`);
    }
  }
}

function parseAndValidate(text: string): MCQ[] {
  const cleaned = stripFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.questions)) {
    throw new Error('Response missing "questions" array');
  }
  if (parsed.questions.length !== 3) {
    throw new Error(`Expected 3 questions, got ${parsed.questions.length}`);
  }
  return parsed.questions.map((q, i) => validateQuestion(q, i));
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function validateQuestion(raw: unknown, idx: number): MCQ {
  const tag = `Q${idx + 1}`;
  if (!isRecord(raw)) throw new Error(`${tag}: not an object`);
  const { question, options, correctIndex, explanation } = raw;
  if (typeof question !== 'string' || question.length === 0) {
    throw new Error(`${tag}: missing question text`);
  }
  if (!Array.isArray(options) || options.length !== 4) {
    throw new Error(`${tag}: expected 4 options`);
  }
  if (!options.every((o): o is string => typeof o === 'string' && o.length > 0)) {
    throw new Error(`${tag}: option not a non-empty string`);
  }
  if (
    typeof correctIndex !== 'number' ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 3
  ) {
    throw new Error(`${tag}: correctIndex out of range`);
  }
  if (typeof explanation !== 'string') {
    throw new Error(`${tag}: missing explanation`);
  }
  return { question, options, correctIndex, explanation };
}
