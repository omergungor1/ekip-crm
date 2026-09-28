import Image from "next/image";

const PALETTE = [
  "bg-[#eef1ff] text-[#2a43c9]",
  "bg-[#e7f0ff] text-[#1d4ed8]",
  "bg-[#f3e8ff] text-[#7e22ce]",
  "bg-[#e0f2fe] text-[#0369a1]",
  "bg-[#ccfbf1] text-[#0f766e]",
  "bg-[#d1fae5] text-[#047857]",
  "bg-[#fef3c7] text-[#b45309]",
  "bg-[#ffe4e6] text-[#be123c]",
  "bg-[#fae8ff] text-[#a21caf]",
  "bg-[#cffafe] text-[#0e7490]",
  "bg-[#ffedd5] text-[#c2410c]",
  "bg-[#ede9fe] text-[#6d28d9]",
];

function colorFor(name) {
  const text = String(name || "?").toLocaleLowerCase("tr-TR");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function initials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase("tr-TR");
}

export default function UserAvatar({ name, url, size = "md" }) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-14 w-14 text-base",
  };

  if (url) {
    return (
      <span className={`${sizes[size]} relative shrink-0 overflow-hidden rounded-full`}>
        <Image src={url} alt={name || "Kullanıcı"} fill className="object-cover" sizes="56px" />
      </span>
    );
  }

  return (
    <span
      className={`${sizes[size]} ${colorFor(name)} grid shrink-0 place-items-center rounded-full font-semibold`}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
