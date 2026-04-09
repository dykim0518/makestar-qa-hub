type InputFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
};

export function InputField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: InputFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-slate-700 placeholder-[var(--muted)]/50 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
      />
    </div>
  );
}
