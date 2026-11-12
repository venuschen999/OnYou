"use client";

type HistoryErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Next.js always passes `error`. The screen shows a generic message so a
// digest or internal detail is not rendered (AGENTS.md §12). The app layout
// already provides the main landmark.
export default function HistoryError({ reset }: HistoryErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="m-0 text-3xl font-extrabold">
        Couldn’t load the history screen
      </h1>
      <p role="alert">Check your internet connection and try again.</p>
      <button
        type="button"
        className="rounded-[14px] bg-primary px-5 py-3 font-bold text-primary-foreground"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
