import { debug } from './debug';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

const TRANSCRIPT_CAP = 12_000;

export class NoTranscriptError extends Error {
  constructor() {
    super('No captions available for this video');
    this.name = 'NoTranscriptError';
  }
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const html = await fetchWatchPageHtml(videoId);
  const player = extractPlayerResponse(html);
  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) throw new NoTranscriptError();

  const track = pickEnglishTrack(tracks);
  if (!track) throw new NoTranscriptError();

  const resp = await fetch(track.baseUrl);
  if (!resp.ok) throw new Error(`Caption fetch failed: ${resp.status}`);
  const xml = await resp.text();
  const text = parseTranscriptXml(xml);
  if (text.trim().length === 0) throw new NoTranscriptError();

  return capTranscript(text);
}

async function fetchWatchPageHtml(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const resp = await fetch(url, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!resp.ok) throw new Error(`Watch page fetch failed: ${resp.status}`);
  return resp.text();
}

function extractPlayerResponse(html: string): PlayerResponse {
  const m = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/);
  if (!m || !m[1]) throw new NoTranscriptError();
  try {
    return JSON.parse(m[1]) as PlayerResponse;
  } catch {
    throw new NoTranscriptError();
  }
}

function pickEnglishTrack(tracks: CaptionTrack[]): CaptionTrack | undefined {
  const en = tracks.filter((t) => t.languageCode.startsWith('en'));
  const manual = en.find((t) => t.kind !== 'asr');
  return manual ?? en[0] ?? tracks[0];
}

function parseTranscriptXml(xml: string): string {
  const out: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1]) out.push(decodeEntities(m[1]));
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)));
}

function capTranscript(text: string): string {
  if (text.length <= TRANSCRIPT_CAP) return text;
  const half = Math.floor(TRANSCRIPT_CAP / 2) - 50;
  const head = text.slice(0, half);
  const tail = text.slice(-half);
  debug('transcript capped', text.length, '→', TRANSCRIPT_CAP);
  return `${head}\n\n... [transcript trimmed] ...\n\n${tail}`;
}
