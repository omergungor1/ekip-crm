import { GalleryHorizontalEnd, Megaphone, RectangleVertical, Sparkles, Square } from "lucide-react";
import { MODE_LIST } from "@/lib/social-media/contentModes";

const ICONS = {
  Sparkles,
  Square,
  RectangleVertical,
  GalleryHorizontalEnd,
  Megaphone,
};

export function ChipRow({ options, value, onChange, disabled }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            className={`h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition disabled:opacity-60 ${active ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink hover:bg-zinc-50"}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ModeSelector({ value, onChange, disabled }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {MODE_LIST.map((mode) => {
        const Icon = ICONS[mode.icon] || Sparkles;
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition disabled:opacity-60 ${active ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink hover:bg-zinc-50"}`}
            onClick={() => onChange(mode.id)}
          >
            <Icon className="h-4 w-4" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
