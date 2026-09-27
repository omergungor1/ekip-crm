import { buildCarouselImagePrompt } from "@/lib/social-media/imagePromptBuilder";

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function palette(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clip(item, 40)).filter(Boolean).slice(0, 8);
}

function designValue(value) {
  if (Array.isArray(value)) return palette(value);
  if (value && typeof value === "object") return clip(JSON.stringify(value), 400);
  return clip(value, 400);
}

export function normalizeDesignSystem(raw) {
  const source = raw?.designSystem && typeof raw.designSystem === "object" ? raw.designSystem : {};
  const typography = raw?.typography && typeof raw.typography === "object"
    ? `Heading: ${clip(raw.typography.headingStyle, 180)}. Body: ${clip(raw.typography.bodyStyle, 180)}.`
    : clip(raw?.typography, 400);
  return {
    creativeDirection: designValue(source.creativeDirection) || clip(raw?.visualStyle, 400),
    colorPalette: palette(source.colorPalette).length ? palette(source.colorPalette) : palette(raw?.colorPalette),
    backgroundStyle: designValue(source.backgroundStyle),
    fontStyle: designValue(source.fontStyle) || typography,
    headlineStyle: designValue(source.headlineStyle),
    illustrationStyle: designValue(source.illustrationStyle),
    photoStyle: designValue(source.photoStyle),
    borderRadius: designValue(source.borderRadius),
    spacing: designValue(source.spacing),
    layoutSystem: designValue(source.layoutSystem),
    brandStyle: designValue(source.brandStyle),
    visualElements: designValue(source.visualElements) || (Array.isArray(raw?.designRules) ? raw.designRules.map((item) => clip(item, 160)).filter(Boolean).join(" ") : ""),
  };
}

export function normalizeCarouselPlan(raw, slideCount) {
  if (!raw || !Array.isArray(raw.slides) || raw.slides.length === 0) {
    throw new Error("Carousel planı okunamadı.");
  }
  const limit = slideCount || 10;
  const source = raw.slides.slice(0, Math.min(limit, 10));
  const designSystem = normalizeDesignSystem(raw);
  const plan = {
    title: clip(raw.title, 160) || "Carousel",
    concept: clip(raw.concept, 600),
    aspectRatio: "1:1",
    designSystem,
    slides: [],
  };
  plan.slides = source.map((slide, index) => {
    const item = {
      id: crypto.randomUUID(),
      index: index + 1,
      type: ["cover", "content", "cta"].includes(slide?.type) ? slide.type : (index === 0 ? "cover" : index === source.length - 1 ? "cta" : "content"),
      headline: clip(slide?.headline, 180) || `Slayt ${index + 1}`,
      body: clip(slide?.body, 400),
      visualIdea: clip(slide?.visualIdea || slide?.imagePrompt, 800),
      status: "idle",
      imageUrl: "",
      contentId: "",
      error: "",
    };
    item.imagePrompt = buildCarouselImagePrompt({
      title: plan.title,
      concept: plan.concept,
      designSystem,
      slide: item,
      slideCount: source.length,
      hasReferences: false,
    });
    return item;
  });
  return plan;
}

export function normalizeCreativeBrief(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Plan okunamadı.");
  const headline = clip(raw.headline, 180);
  if (!headline && !clip(raw.imagePrompt, 4000)) throw new Error("Plan okunamadı.");
  return {
    headline,
    subheadline: clip(raw.subheadline, 220),
    supportingText: clip(raw.supportingText, 300),
    cta: clip(raw.cta, 80),
    concept: clip(raw.concept, 400),
    composition: clip(raw.composition, 400),
    background: clip(raw.background, 300),
    colorPalette: palette(raw.colorPalette),
    typography: raw?.typography && typeof raw.typography === "object"
      ? clip(`${raw.typography.headingStyle || ""} ${raw.typography.bodyStyle || ""}`, 300)
      : clip(raw.typography, 300),
    objects: clip(raw.objects, 300),
    brandFeel: clip(raw.brandFeel, 200),
    imagePrompt: clip(raw.imagePrompt, 4000),
  };
}

export function creativeCaption(brief) {
  return [brief.headline, brief.subheadline || brief.supportingText, brief.cta].filter(Boolean).join("\n");
}
