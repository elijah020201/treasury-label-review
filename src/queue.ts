export interface QueueState<T> {
  id: string;
  index: number;
  status: "Queued" | "Processing" | "Complete" | "Failed";
  attempts: number;
  queueMs: number;
  processingMs: number;
  result?: T;
  error?: string;
}
export class RequestError extends Error {
  constructor(
    message: string,
    public retryable = false,
    public status = 500,
  ) {
    super(message);
  }
}
export async function runQueue<I, O>(
  items: I[],
  work: (item: I, index: number) => Promise<O>,
  update: (states: QueueState<O>[]) => void,
  concurrency = 2,
  wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
) {
  if (items.length > 300 || concurrency < 1 || concurrency > 4)
    throw new Error("Queue limits exceeded.");
  const queued = Date.now(),
    states: QueueState<O>[] = items.map((_, index) => ({
      id: crypto.randomUUID(),
      index,
      status: "Queued",
      attempts: 0,
      queueMs: 0,
      processingMs: 0,
    }));
  const emit = () => update(states.map((s) => ({ ...s })));
  let cursor = 0;
  emit();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++,
          s = states[index];
        s.status = "Processing";
        s.queueMs = Date.now() - queued;
        const start = Date.now();
        emit();
        for (let attempt = 0; attempt < 2; attempt++) {
          s.attempts++;
          try {
            s.result = await work(items[index], index);
            s.status = "Complete";
            break;
          } catch (e) {
            if (e instanceof RequestError && e.retryable && attempt === 0) {
              await wait(1500);
              continue;
            }
            s.status = "Failed";
            s.error = e instanceof Error ? e.message : "Processing failed.";
          }
        }
        s.processingMs = Date.now() - start;
        emit();
      }
    }),
  );
  return states;
}
