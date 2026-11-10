import { DURATIONS, type DurationMinutes } from "@/lib/validation/session";

type DurationPickerProps = {
  value: DurationMinutes;
  onChange: (duration: DurationMinutes) => void;
};

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <fieldset className="m-0 grid grid-cols-3 gap-2.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-semibold">How long?</legend>
      {DURATIONS.map((minutes) => {
        const selected = value === minutes;
        return (
          <label
            key={minutes}
            className={`relative cursor-pointer rounded-[14px] border bg-surface px-1.5 py-3.5 text-center ${selected ? "border-primary bg-tint" : "border-line"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name="duration"
              value={minutes}
              checked={selected}
              aria-label={`${minutes} minutes`}
              onChange={() => onChange(minutes)}
            />
            <b aria-hidden="true" className="block text-2xl tabular-nums">
              {minutes}
            </b>
            <small aria-hidden="true" className="text-muted">
              minutes
            </small>
          </label>
        );
      })}
    </fieldset>
  );
}
