import {
  appleHint,
  coinHint,
  previewDurationRewards,
  type TodayFeeding,
} from "@/lib/domain/durationPreview";
import { DURATIONS, type DurationMinutes } from "@/lib/validation/session";

type DurationPickerProps = {
  value: DurationMinutes;
  onChange: (duration: DurationMinutes) => void;
  // Today's progress for the apple hint (#72); null while loading or if it
  // could not load, when only coins are shown.
  today?: TodayFeeding | null;
};

export function DurationPicker({
  value,
  onChange,
  today = null,
}: DurationPickerProps) {
  return (
    <fieldset className="m-0 grid grid-cols-3 gap-2.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-semibold">How long?</legend>
      {DURATIONS.map((minutes) => {
        const selected = value === minutes;
        const coins = coinHint(minutes);
        const apples = today
          ? appleHint(previewDurationRewards(minutes, today))
          : null;
        const coinsId = `duration-${minutes}-coins`;
        const combinedId = `duration-${minutes}-rewards`;
        return (
          <label
            key={minutes}
            className={`relative flex cursor-pointer flex-col gap-0.5 rounded-[14px] border bg-surface px-1.5 py-3.5 text-center ${selected ? "border-primary bg-tint" : "border-line"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name="duration"
              value={minutes}
              checked={selected}
              aria-label={`${minutes} minutes`}
              aria-describedby={apples ? combinedId : coinsId}
              onChange={() => onChange(minutes)}
            />
            <b aria-hidden="true" className="block text-2xl tabular-nums">
              {minutes}
            </b>
            <small aria-hidden="true" className="text-muted">
              minutes
            </small>
            <span
              id={coinsId}
              aria-hidden="true"
              className="mt-1.5 text-[0.82rem] font-bold text-primary"
            >
              {coins}
            </span>
            {apples ? (
              <span aria-hidden="true" className="text-xs text-muted">
                {apples}
              </span>
            ) : null}
            {/* One description per radio; without an apple hint the
                visible coin text describes it on its own. */}
            {apples ? (
              <span id={combinedId} className="sr-only">
                {`${coins}, ${apples}`}
              </span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}
