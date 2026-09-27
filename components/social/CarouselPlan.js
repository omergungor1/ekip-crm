import { useState } from "react";
import Button, { Field, textareaClass } from "@/components/ui/Button";

const TYPE_LABELS = { cover: "Kapak", content: "İçerik", cta: "Çağrı" };

function SlideCard({ slide, disabled, onEdit, onGenerate }) {
  const [draft, setDraft] = useState(null);
  const editing = draft !== null;
  const busy = slide.status === "generating" || slide.status === "waiting";
  const locked = disabled || busy;

  function save() {
    onEdit(slide.id, {
      headline: draft.headline.trim() || slide.headline,
      body: draft.body.trim(),
      visualIdea: draft.visualIdea.trim(),
    });
    setDraft(null);
  }

  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Slayt {slide.index}</p>
      <p className="mt-1 text-xs text-accent">{TYPE_LABELS[slide.type] || "İçerik"}</p>
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt={slide.headline} className="mt-3 aspect-square w-full rounded-xl bg-zinc-50 object-contain" />
      ) : (
        <div className="mt-3 grid aspect-square place-items-center rounded-xl border border-dashed border-line bg-zinc-50 px-4 text-center text-sm text-muted">
          {slide.status === "generating" ? "Görsel oluşturuluyor..." : slide.status === "waiting" ? "Sırada" : "Henüz görsel yok"}
        </div>
      )}
      {editing ? (
        <div className="mt-3 space-y-2">
          <Field label="Başlık">
            <textarea className={textareaClass} value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} />
          </Field>
          <Field label="Metin">
            <textarea className={textareaClass} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </Field>
          <Field label="Görsel fikri">
            <textarea className={textareaClass} value={draft.visualIdea} onChange={(event) => setDraft({ ...draft, visualIdea: event.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save}>Kaydet</Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>Vazgeç</Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="mt-3 text-sm font-semibold">{slide.headline}</h3>
          {slide.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{slide.body}</p> : null}
        </>
      )}
      {slide.status === "error" ? <p className="mt-3 text-sm text-rose-600">Slayt {slide.index} oluşturulamadı. {slide.error}</p> : null}
      {slide.status === "generating" ? <p className="mt-3 text-sm text-muted">Görsel oluşturuluyor...</p> : null}
      {!editing ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" disabled={locked} onClick={() => setDraft({ headline: slide.headline, body: slide.body, visualIdea: slide.visualIdea })}>
            Düzenle
          </Button>
          <Button disabled={locked} onClick={() => onGenerate(slide.id)}>
            {slide.status === "error" ? "Tekrar Dene" : slide.imageUrl ? "Yeniden Üret" : "Görseli Üret"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export default function CarouselPlan({ plan, busy, onEdit, onGenerate, onGenerateAll }) {
  const slides = plan.slides || [];
  const done = slides.filter((slide) => slide.status === "completed").length;
  const remaining = slides.some((slide) => slide.status === "idle" || slide.status === "error");

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Carousel</p>
        <h2 className="mt-1 text-lg font-semibold">{plan.title}</h2>
        <p className="mt-1 text-sm text-muted">{slides.length} slayt · 1:1 Instagram carousel</p>
        {plan.concept ? <p className="mt-2 text-sm">{plan.concept}</p> : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">{done} / {slides.length} görsel oluşturuldu</p>
          <Button onClick={onGenerateAll} disabled={busy || !remaining}>Tümünü Üret</Button>
        </div>
      </div>
      <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
        {slides.map((slide) => (
          <SlideCard key={slide.id} slide={slide} disabled={busy} onEdit={onEdit} onGenerate={onGenerate} />
        ))}
      </div>
    </section>
  );
}
