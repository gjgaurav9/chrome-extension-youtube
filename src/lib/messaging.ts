import type { RuntimeMessage } from './types';

interface OkResponse<T> {
  ok: true;
  data: T;
}
interface ErrResponse {
  ok: false;
  error: string;
}

export async function send<T = unknown>(message: RuntimeMessage): Promise<T> {
  const resp = (await chrome.runtime.sendMessage(message)) as
    | OkResponse<T>
    | ErrResponse
    | undefined;
  if (!resp) {
    throw new Error('No response from service worker (it may have been killed)');
  }
  if (!resp.ok) {
    throw new Error(resp.error);
  }
  return resp.data;
}
