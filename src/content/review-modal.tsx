import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import css from '../styles/globals.css?inline';
import { send } from '../lib/messaging';
import { copy } from '../lib/copy';
import type { MCQ, SavedVideo } from '../lib/types';
import { ERR_NO_API_KEY, ERR_NO_TRANSCRIPT } from '../lib/types';

interface ModalProps {
  videos: SavedVideo[];
  onClose: () => void;
}

function Modal({ videos, onClose }: ModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const current = videos[currentIdx];

  if (!current) return <DonePanel onClose={onClose} />;

  return (
    <VideoCard
      key={current.id}
      video={current}
      remaining={videos.length - currentIdx}
      onAdvance={() => setCurrentIdx((i) => i + 1)}
      onClose={onClose}
    />
  );
}

interface VideoCardProps {
  video: SavedVideo;
  remaining: number;
  onAdvance: () => void;
  onClose: () => void;
}

type LoadState = 'loading' | 'no-transcript' | 'no-key' | 'error' | 'ready' | 'scored';

function VideoCard({ video, remaining, onAdvance, onClose }: VideoCardProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [nextReviewAt, setNextReviewAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    send<MCQ[]>({ type: 'GENERATE_QUESTIONS', videoId: video.id })
      .then((qs) => {
        if (cancelled) return;
        setQuestions(qs);
        setState('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (e.message.includes(ERR_NO_TRANSCRIPT)) {
          send({ type: 'REMOVE_VIDEO', id: video.id }).finally(() => {
            if (!cancelled) setState('no-transcript');
          });
        } else if (e.message.includes(ERR_NO_API_KEY)) {
          setState('no-key');
        } else {
          setErrorMsg(e.message);
          setState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [video.id]);

  function handleNext() {
    const q = questions[qIdx];
    if (!q) return;
    const newCorrect = correctCount + (picked === q.correctIndex ? 1 : 0);
    if (qIdx + 1 >= questions.length) {
      setCorrectCount(newCorrect);
      setState('scored');
      send<{ nextReviewAt: number }>({
        type: 'RECORD_REVIEW',
        videoId: video.id,
        score: newCorrect,
      })
        .then((r) => setNextReviewAt(r.nextReviewAt))
        .catch(() => setNextReviewAt(Date.now()));
    } else {
      setCorrectCount(newCorrect);
      setQIdx((i) => i + 1);
      setPicked(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Header video={video} remaining={remaining} onClose={onClose} />
      {state === 'loading' && <Skeleton />}
      {state === 'no-transcript' && (
        <ContinuePanel message={copy.modalNoTranscript} onContinue={onAdvance} />
      )}
      {state === 'no-key' && <ContinuePanel message={copy.modalNoApiKey} onContinue={onClose} />}
      {state === 'error' && (
        <ContinuePanel
          message={`${copy.modalError} (${errorMsg})`}
          onContinue={onAdvance}
        />
      )}
      {state === 'ready' && questions[qIdx] && (
        <QuestionView
          q={questions[qIdx]!}
          qIdx={qIdx}
          total={questions.length}
          picked={picked}
          onPick={setPicked}
          onNext={handleNext}
        />
      )}
      {state === 'scored' && (
        <ScorePanel
          video={video}
          correct={correctCount}
          total={questions.length}
          nextReviewAt={nextReviewAt}
          onContinue={onAdvance}
        />
      )}
    </div>
  );
}

function Header({
  video,
  remaining,
  onClose,
}: {
  video: SavedVideo;
  remaining: number;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <img
        src={video.thumbnailUrl}
        alt=""
        className="w-24 h-16 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{copy.modalRemaining(remaining)}</div>
        <div className="font-semibold text-base leading-tight truncate">
          {video.title}
        </div>
        <div className="text-sm text-gray-600 truncate">{video.channelName}</div>
        <div className="text-xs text-gray-400 mt-1">{copy.modalSubtitle}</div>
      </div>
      <button
        onClick={onClose}
        aria-label={copy.modalClose}
        className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
      >
        ×
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      <div className="text-xs text-gray-500 mt-2">{copy.modalLoading}</div>
    </div>
  );
}

function ContinuePanel({
  message,
  onContinue,
}: {
  message: string;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-gray-700">{message}</p>
      <button
        onClick={onContinue}
        className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
      >
        {copy.modalNextVideo}
      </button>
    </div>
  );
}

interface QuestionViewProps {
  q: MCQ;
  qIdx: number;
  total: number;
  picked: number | null;
  onPick: (i: number) => void;
  onNext: () => void;
}

function QuestionView({ q, qIdx, total, picked, onPick, onNext }: QuestionViewProps) {
  const revealed = picked !== null;
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">{copy.modalQuestionN(qIdx + 1, total)}</div>
      <div className="font-medium text-gray-900">{q.question}</div>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'w-full text-left px-3 py-2 rounded border ';
          if (!revealed) {
            cls += 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer';
          } else if (i === q.correctIndex) {
            cls += 'border-emerald-500 bg-emerald-50 text-emerald-900';
          } else if (i === picked) {
            cls += 'border-red-500 bg-red-50 text-red-900';
          } else {
            cls += 'border-gray-200 text-gray-500';
          }
          return (
            <button
              key={i}
              onClick={() => !revealed && onPick(i)}
              disabled={revealed}
              className={cls}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-200">
          {q.explanation}
        </div>
      )}
      {revealed && (
        <button
          onClick={onNext}
          className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
        >
          {copy.modalNext}
        </button>
      )}
    </div>
  );
}

interface ScorePanelProps {
  video: SavedVideo;
  correct: number;
  total: number;
  nextReviewAt: number | null;
  onContinue: () => void;
}

function ScorePanel({
  video,
  correct,
  total,
  nextReviewAt,
  onContinue,
}: ScorePanelProps) {
  return (
    <div className="space-y-3">
      <div className="text-3xl font-bold text-emerald-600">
        {copy.modalScore(correct, total)}
      </div>
      {nextReviewAt !== null && (
        <div className="text-sm text-gray-600">
          {copy.modalNextReview(new Date(nextReviewAt))}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
        >
          {copy.modalRewatch}
        </a>
        <button
          onClick={onContinue}
          className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
        >
          {copy.modalNextVideo}
        </button>
      </div>
    </div>
  );
}

function DonePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="text-4xl">🎉</div>
      <div className="text-lg font-semibold">{copy.modalAllDone}</div>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
      >
        {copy.modalClose}
      </button>
    </div>
  );
}

let activeHost: HTMLElement | null = null;

export function mountReviewModal(videos: SavedVideo[]): void {
  if (activeHost) return;
  const host = document.createElement('div');
  host.id = 'revisetube-modal-host';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
  });
  document.body.appendChild(host);
  activeHost = host;

  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = `:host { all: initial; }\n${css}`;
  shadow.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 bg-black/60 flex items-center justify-center p-4';
  const dialog = document.createElement('div');
  dialog.className =
    'bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto';
  overlay.appendChild(dialog);
  shadow.appendChild(overlay);

  const root = createRoot(dialog);
  const close = () => {
    root.unmount();
    host.remove();
    activeHost = null;
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  root.render(
    <StrictMode>
      <Modal videos={videos} onClose={close} />
    </StrictMode>,
  );
}
