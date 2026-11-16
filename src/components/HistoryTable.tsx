import type { ReactElement } from "react";
import {
  formatHistoryCoins,
  formatHistoryDuration,
  formatHistoryFeeding,
  formatHistoryWhen,
  historyOutcomeLabel,
  type HistoryEntry,
} from "@/lib/domain/historyDisplay";

type HistoryTableProps = {
  entries: HistoryEntry[];
  timeZone: string;
  now: string;
};

const HEADER =
  "border-b border-line px-4 pb-2.5 text-left text-[0.85rem] font-semibold text-muted";

function headerClass(alignRight: boolean): string {
  return alignRight ? `${HEADER} text-right` : HEADER;
}

function Rewards({ entry }: { entry: HistoryEntry }): ReactElement {
  if (entry.outcome === "ABANDONED") {
    return <span className="tabular-nums">No rewards</span>;
  }
  return (
    <span className="tabular-nums">
      {formatHistoryCoins(entry.coinsEarned)}
      <span className="block text-[0.82rem] text-muted max-[600px]:text-[0.78rem]">
        {formatHistoryFeeding(entry.feedingMinutesEarned)}
      </span>
    </span>
  );
}

function HistoryRow({
  entry,
  timeZone,
  now,
}: {
  entry: HistoryEntry;
  timeZone: string;
  now: string;
}): ReactElement {
  const completed = entry.outcome === "COMPLETED";
  const badge = completed
    ? "bg-tint text-primary"
    : "border border-danger text-danger";
  const cell =
    "border-b border-line px-4 py-[13px] max-[600px]:border-0 max-[600px]:p-0";
  const detail = `${cell} max-[600px]:text-[0.82rem] max-[600px]:text-muted`;
  return (
    <tr className="max-[600px]:grid max-[600px]:grid-cols-[minmax(0,1fr)_auto] max-[600px]:gap-x-2.5 max-[600px]:gap-y-0.5 max-[600px]:rounded-[14px] max-[600px]:border max-[600px]:border-line max-[600px]:bg-surface max-[600px]:px-3 max-[600px]:py-2.5">
      <td
        className={`${cell} font-semibold max-[600px]:col-start-1 max-[600px]:row-start-1 max-[600px]:truncate max-[600px]:text-[0.94rem]`}
      >
        {entry.taskName}
      </td>
      <td
        className={`${detail} max-[600px]:col-start-1 max-[600px]:row-start-2`}
      >
        {formatHistoryWhen(new Date(entry.startedAt), new Date(now), timeZone)}
      </td>
      <td
        className={`${detail} text-right tabular-nums max-[600px]:col-start-1 max-[600px]:row-start-3 max-[600px]:text-left`}
      >
        {formatHistoryDuration(entry.durationMinutes)}
      </td>
      <td
        className={`${cell} max-[600px]:col-start-2 max-[600px]:row-start-1 max-[600px]:justify-self-end`}
      >
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold ${badge}`}
        >
          {historyOutcomeLabel(entry.outcome)}
        </span>
      </td>
      <td
        className={`${detail} text-right max-[600px]:col-start-2 max-[600px]:row-span-2 max-[600px]:row-start-2 max-[600px]:self-end max-[600px]:justify-self-end`}
      >
        <Rewards entry={entry} />
      </td>
    </tr>
  );
}

export function HistoryTable({
  entries,
  timeZone,
  now,
}: HistoryTableProps): ReactElement {
  return (
    <table className="mt-[18px] w-full border-collapse text-[0.95rem] max-[600px]:mt-3.5 max-[600px]:block">
      <thead className="max-[600px]:hidden">
        <tr>
          <th scope="col" className={headerClass(false)}>
            Task
          </th>
          <th scope="col" className={headerClass(false)}>
            Date
          </th>
          <th scope="col" className={headerClass(true)}>
            Duration
          </th>
          <th scope="col" className={headerClass(false)}>
            Outcome
          </th>
          <th scope="col" className={headerClass(true)}>
            Rewards
          </th>
        </tr>
      </thead>
      <tbody className="max-[600px]:flex max-[600px]:flex-col max-[600px]:gap-2">
        {entries.map((entry) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            timeZone={timeZone}
            now={now}
          />
        ))}
      </tbody>
    </table>
  );
}
