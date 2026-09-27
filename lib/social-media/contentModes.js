export const CAROUSEL_GENERATION_CONCURRENCY = 1;

export const SLIDE_COUNTS = [
  { id: "auto", label: "Otomatik" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
  { id: "5", label: "5" },
  { id: "6", label: "6" },
  { id: "7", label: "7" },
  { id: "8", label: "8" },
  { id: "9", label: "9" },
  { id: "10", label: "10" },
];

export const AD_FORMATS = [
  { id: "post", label: "Instagram Post", size: "1024x1024", ratio: "1:1" },
  { id: "story", label: "Instagram Story", size: "1024x1792", ratio: "9:16" },
  { id: "landscape", label: "Yatay Reklam", size: "1792x1024", ratio: "16:9" },
];

export const CONTENT_MODES = {
  free: {
    id: "free",
    label: "Serbest",
    icon: "Sparkles",
    description: "Metin veya görsel. İstediğini doğrudan yaz.",
    fieldLabel: "İstek",
    placeholder: "Ne üretmek istiyorsun?",
    action: "Gönder",
    busyLabel: "Gönderiliyor...",
    hint: "Servis metin veya görsel üretir. Logo ve tema görseli ekleyebilirsin. Görsel bir iki dakika sürebilir.",
    aspectRatio: "1:1",
    size: "1024x1024",
    planner: null,
    imageGeneration: "direct",
    supportsReferences: true,
  },
  instagram_post: {
    id: "instagram_post",
    label: "Instagram Post",
    icon: "Square",
    description: "Fikrini yaz, stüdyo post görselini hazırlasın.",
    fieldLabel: "Post",
    placeholder: "Post ne hakkında olsun?",
    action: "Gönder",
    busyLabel: "Hazırlanıyor...",
    hint: "Başlık, kompozisyon ve görsel promptunu stüdyo hazırlar. Kare 1:1 post üretilir.",
    aspectRatio: "1:1",
    size: "1024x1024",
    planner: "creative",
    imageGeneration: "planned",
    supportsReferences: true,
  },
  instagram_story: {
    id: "instagram_story",
    label: "Story",
    icon: "RectangleVertical",
    description: "Dikey story görseli.",
    fieldLabel: "Story",
    placeholder: "Story ne hakkında olsun?",
    action: "Gönder",
    busyLabel: "Hazırlanıyor...",
    hint: "Dikey 9:16 story. Üst ve alt güvenli alan stüdyo tarafından bırakılır.",
    aspectRatio: "9:16",
    size: "1024x1792",
    planner: "creative",
    imageGeneration: "planned",
    supportsReferences: true,
  },
  carousel: {
    id: "carousel",
    label: "Carousel",
    icon: "GalleryHorizontalEnd",
    description: "Önce slayt planı, sonra tek tek görseller.",
    fieldLabel: "Carousel",
    placeholder: "Carousel ne hakkında olsun?",
    action: "Carousel Planı Oluştur",
    busyLabel: "Planlanıyor...",
    hint: "Önce slayt planı çıkar. Görselleri sen onayladıktan sonra, tek tek veya sırayla üretilir.",
    aspectRatio: "1:1",
    size: "1024x1024",
    planner: "carousel",
    imageGeneration: "slides",
    supportsReferences: true,
  },
  ad_creative: {
    id: "ad_creative",
    label: "Reklam",
    icon: "Megaphone",
    description: "Reklam görseli.",
    fieldLabel: "Reklam",
    placeholder: "Ne reklamı oluşturmak istiyorsun?",
    action: "Gönder",
    busyLabel: "Hazırlanıyor...",
    hint: "Başlık, destek metni ve çağrı stüdyo tarafından yazılır, sonra görsel üretilir.",
    aspectRatio: "1:1",
    size: "1024x1024",
    planner: "ad",
    imageGeneration: "planned",
    supportsReferences: true,
  },
};

export const MODE_LIST = Object.values(CONTENT_MODES);

export function getContentMode(id) {
  return CONTENT_MODES[id] || null;
}

export function resolveSize(modeId, adFormat) {
  if (modeId === "ad_creative") {
    return AD_FORMATS.find((item) => item.id === adFormat)?.size || AD_FORMATS[0].size;
  }
  return getContentMode(modeId)?.size || "1024x1024";
}

export function resolveRatio(modeId, adFormat) {
  if (modeId === "ad_creative") {
    return AD_FORMATS.find((item) => item.id === adFormat)?.ratio || AD_FORMATS[0].ratio;
  }
  return getContentMode(modeId)?.aspectRatio || "1:1";
}
