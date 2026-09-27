import { ImagePlus, X } from "lucide-react";
import Button, { Field, textareaClass } from "@/components/ui/Button";

export default function PromptComposer({
  mode,
  prompt,
  onPrompt,
  references,
  onAddFiles,
  onRemove,
  busy,
  onSubmit,
  extra,
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <Field label={mode.fieldLabel}>
        <textarea
          id="social-prompt"
          className={textareaClass}
          value={prompt}
          placeholder={mode.placeholder}
          onChange={(event) => onPrompt(event.target.value)}
        />
      </Field>
      {extra}
      {references.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {references.map((item) => (
            <div key={item.id} className="relative">
              <img src={item.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Görseli kaldır"
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"
                onClick={() => onRemove(item.id)}
                disabled={busy}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-zinc-50">
          <ImagePlus className="h-4 w-4" />
          Görsel ekle
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onAddFiles} disabled={busy} />
        </label>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? mode.busyLabel : mode.action}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">{mode.hint}</p>
    </div>
  );
}
