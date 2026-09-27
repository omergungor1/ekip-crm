const FORMAT_RULES = {
  instagram_post: "Square feed post. Keep the headline, supporting line and CTA inside a safe margin of about 8% from every edge. One clear hierarchy. High contrast. Do not place important text at the extreme edges.",
  instagram_story: "Vertical story. Do not place important text in the top 14% or the bottom 20% of the frame, because Instagram story controls cover those zones. Use a large mobile-readable headline. Leave a clear area for the CTA. One idea only.",
  ad_landscape: "Horizontal advertising creative. Keep the headline, product and CTA inside the center 80% so a crop does not cut them. The offer must be readable at a glance.",
  carousel: "Square carousel slide. Same margins, type scale and color system on every slide. One idea per slide. Headline must be readable on a phone.",
};

export function formatRulesFor(modeId, adFormat) {
  if (modeId === "instagram_story" || (modeId === "ad_creative" && adFormat === "story")) return FORMAT_RULES.instagram_story;
  if (modeId === "ad_creative" && adFormat === "landscape") return FORMAT_RULES.ad_landscape;
  if (modeId === "carousel") return FORMAT_RULES.carousel;
  return FORMAT_RULES.instagram_post;
}

export function parseModelJson(text) {
  const trimmed = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Plan okunamadı.");
  const slice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new Error("Plan okunamadı.");
    }
  }
}

const DIRECTOR = "You are a senior social media creative director and graphic designer. You plan Turkish social content. All customer-facing copy (headlines, body, CTA) must be in Turkish. Return only one raw JSON object. Do not wrap it in markdown.";

export function creativeMessages({ mode, idea, brand, adFormat, hasReferences, ratio }) {
  const kind = mode.id === "ad_creative" ? "advertising creative" : mode.label;
  return [
    { role: "system", content: DIRECTOR },
    {
      role: "user",
      content: [
        `Plan one ${kind}.`,
        `Brand: ${brand.name}`,
        brand.description ? `Brand description: ${brand.description}` : "",
        `Idea: ${idea}`,
        `Aspect ratio: ${ratio}`,
        `Format rules: ${formatRulesFor(mode.id, adFormat)}`,
        hasReferences ? "The user attached reference images (logo, product or previous design). They will be sent to the image model. Mention that the logo must be respected." : "No reference images were attached.",
        "Decide the concept, headline, supporting line, CTA, composition, hierarchy, background, color palette, typography, objects and brand feel yourself.",
        `Return JSON with keys: headline, subheadline, supportingText, cta, concept, composition, background, colorPalette (array of hex colors), typography, objects, brandFeel, imagePrompt.`,
        "imagePrompt is a detailed art direction paragraph. Do not include a phone mockup.",
      ].filter(Boolean).join("\n"),
    },
  ];
}

export function carouselMessages({ idea, brand, slideCount, hasReferences }) {
  const countLine = slideCount
    ? `Create exactly ${slideCount} slides.`
    : "Choose the best slide count between 5 and 8. Never fewer than 3 or more than 10.";
  return [
    { role: "system", content: DIRECTOR },
    {
      role: "user",
      content: [
        "Plan one Instagram carousel. Do not describe the slides as unrelated posters. Design them as one set.",
        `Brand: ${brand.name}`,
        brand.description ? `Brand description: ${brand.description}` : "",
        `Idea: ${idea}`,
        countLine,
        "First slide is a cover. Last slide is a CTA. Middle slides teach one point each.",
        hasReferences ? "Reference images of the logo or brand will be attached when each slide is rendered. The design system must leave a consistent place for that logo." : "",
        "Return JSON with keys: title, concept, aspectRatio (\"1:1\"), visualStyle, colorPalette, typography, designRules, designSystem, slides.",
        "designSystem keys: creativeDirection, colorPalette, backgroundStyle, fontStyle, headlineStyle, illustrationStyle, photoStyle, borderRadius, spacing, layoutSystem, brandStyle, visualElements.",
        "Each slide has: index, type (cover, content or cta), headline, body, visualIdea, imagePrompt.",
        "imagePrompt is only the art direction for that slide, not a full design-system repeat.",
      ].filter(Boolean).join("\n"),
    },
  ];
}
