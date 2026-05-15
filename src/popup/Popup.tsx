import { useEffect, useState } from 'react';
import { send } from '../lib/messaging';
import { copy } from '../lib/copy';

export function Popup() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    send<number>({ type: 'GET_DUE_COUNT' })
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  return (
    <div className="p-4 w-64 space-y-3 bg-white">
      <div className="text-base font-semibold text-gray-900">
        {count === null
          ? '…'
          : count > 0
            ? copy.popupDue(count)
            : copy.popupNoneDue}
      </div>
      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
      >
        {copy.popupOpenSettings}
      </button>
    </div>
  );
}
