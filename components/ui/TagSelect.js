"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { inputClass } from "@/components/ui/Button";
import AnchoredMenu from "@/components/ui/AnchoredMenu";
import { createClient } from "@/lib/supabase/client";
import { PROJECT_COLORS } from "@/lib/constants";
import { errorMessage } from "@/lib/format";

export default function TagSelect({ tags, value = [], onChange, onCreated, profileId }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const anchorRef = useRef(null);
  const selected = tags.filter((tag) => value.includes(tag.id));

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  async function createTag() {
    const nextName = name.trim();
    if (!nextName) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: nextName,
          created_by: profileId,
          color: PROJECT_COLORS[tags.length % PROJECT_COLORS.length],
        })
        .select("id, name, color")
        .single();
      if (error) throw error;
      onCreated(data);
      onChange([...value, data.id]);
      setName("");
      toast.success("Etiket eklendi.");
    } catch (error) {
      toast.error(errorMessage(error, "Etiket eklenemedi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        ref={anchorRef}
        type="button"
        className={`${inputClass} flex items-center text-left`}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">
          {selected.length ? selected.map((tag) => tag.name).join(", ") : "Etiket seç"}
        </span>
      </button>
      <AnchoredMenu
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        footer={
          <div className="mt-2 flex shrink-0 gap-2 border-t border-line pt-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Yeni etiket"
              className={inputClass}
            />
            <button
              type="button"
              disabled={busy}
              onClick={createTag}
              className="h-11 shrink-0 rounded-xl bg-accent px-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Ekle
            </button>
          </div>
        }
      >
        <div className="space-y-1">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50"
            >
              <input type="checkbox" readOnly checked={value.includes(tag.id)} className="h-4 w-4" />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tag.color }} />
              {tag.name}
            </button>
          ))}
          {tags.length === 0 ? <div className="px-2 py-2 text-sm text-muted">Henüz etiket yok.</div> : null}
        </div>
      </AnchoredMenu>
    </div>
  );
}
