export const copy = {
  buttonAdd: '📚 Add to Revision',
  buttonAdding: '…',
  buttonAdded: '✓ Added',
  buttonError: 'Error — try again',

  homeCardTitle: (n: number): string =>
    `🧠 You have ${n} video${n === 1 ? '' : 's'} due for revision`,
  homeCardCta: 'Start Review',

  modalSubtitle: "We'll test if you still remember the key ideas.",
  modalLoading: 'Generating questions…',
  modalNext: 'Next',
  modalRewatch: 'Rewatch on YouTube',
  modalNextVideo: 'Next video',
  modalClose: 'Close',
  modalAllDone: 'All done — see you tomorrow.',
  modalError: 'Something went wrong generating questions for this video.',
  modalNoTranscript:
    "This video has no transcript — can't generate questions. Removing from queue.",
  modalNoApiKey:
    'No API key set. Open the extension options and add your Anthropic API key.',
  modalScore: (correct: number, total: number): string => `${correct}/${total}`,
  modalNextReview: (date: Date): string =>
    `Next review on ${date.toLocaleDateString(undefined, { dateStyle: 'medium' })}`,
  modalQuestionN: (n: number, total: number): string => `Question ${n} of ${total}`,
  modalRemaining: (n: number): string => `${n} to go`,

  optionsTitle: 'ReviseTube settings',
  optionsApiKeyLabel: 'Anthropic API key',
  optionsApiKeyPlaceholder: 'sk-ant-…',
  optionsApiKeySave: 'Save key',
  optionsApiKeySaved: 'Saved',
  optionsApiKeyHelp:
    'Your key is stored locally in chrome.storage. It never leaves your browser.',
  optionsVideoListTitle: 'Saved videos',
  optionsVideoListEmpty:
    'No videos saved yet. Hit "Add to Revision" on any YouTube watch page.',
  optionsRemove: 'Remove',

  popupDue: (n: number): string => `${n} video${n === 1 ? '' : 's'} due`,
  popupNoneDue: 'No videos due',
  popupOpenSettings: 'Open settings',
};
