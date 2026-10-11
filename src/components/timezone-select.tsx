import { timeZoneOptions } from "@/lib/time";

export function TimezoneSelect({ name = "timezone", defaultValue, id }: { name?: string; defaultValue: string; id?: string }) {
  const { common, all } = timeZoneOptions(defaultValue);
  return (
    <select name={name} id={id ?? name} defaultValue={defaultValue} required>
      <optgroup label="Common">
        {common.map(([zone, label]) => (
          <option key={zone} value={zone}>
            {label}
          </option>
        ))}
      </optgroup>
      <optgroup label="All time zones">
        {all.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
