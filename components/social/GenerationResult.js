import Button from "@/components/ui/Button";

function frameClass(size) {
  if (size === "1024x1792") return "mx-auto aspect-[9/16] max-h-[32rem]";
  if (size === "1792x1024") return "aspect-video";
  return "aspect-square";
}

export default function GenerationResult({ item, imageSrc, size, busy, onRetry, onEdit }) {
  return (
    <article className="mt-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="text-sm font-medium">Son üretim</p>
      {item.kind === "image" && imageSrc ? (
        <img src={imageSrc} alt={item.prompt || ""} className={`mt-3 w-full rounded-xl bg-zinc-50 object-contain ${frameClass(size)}`} />
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.body}</p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onRetry} disabled={busy}>Yeniden üret</Button>
        <Button variant="secondary" onClick={onEdit} disabled={busy}>İsteği düzenle</Button>
      </div>
    </article>
  );
}
