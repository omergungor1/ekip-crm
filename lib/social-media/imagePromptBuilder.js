function lines(parts) {
  return parts.filter(Boolean).join("\n\n");
}

function designText(designSystem) {
  if (!designSystem || typeof designSystem !== "object") return "";
  return Object.entries(designSystem)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(", ") : String(value || "").trim();
      return text ? `${key}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function buildDirectedImagePrompt({ modeLabel, ratio, formatRules, brief, brand, hasReferences }) {
  return lines([
    `Create one finished ${modeLabel} graphic for the brand "${brand?.name || "the brand"}".`,
    brand?.description ? `Brand description: ${brand.description}` : "",
    brief?.headline ? `HEADLINE, render this exact text: ${brief.headline}` : "",
    brief?.subheadline ? `SUBHEADLINE, render this exact text: ${brief.subheadline}` : "",
    brief?.supportingText ? `SUPPORTING TEXT, render this exact text: ${brief.supportingText}` : "",
    brief?.cta ? `CTA, render this exact text: ${brief.cta}` : "",
    brief?.concept ? `CONCEPT: ${brief.concept}` : "",
    brief?.composition ? `COMPOSITION: ${brief.composition}` : "",
    brief?.background ? `BACKGROUND: ${brief.background}` : "",
    Array.isArray(brief?.colorPalette) && brief.colorPalette.length ? `COLORS: ${brief.colorPalette.join(", ")}` : "",
    brief?.typography ? `TYPOGRAPHY: ${brief.typography}` : "",
    brief?.objects ? `OBJECTS: ${brief.objects}` : "",
    brief?.brandFeel ? `BRAND FEEL: ${brief.brandFeel}` : "",
    brief?.imagePrompt ? `ART DIRECTION: ${brief.imagePrompt}` : "",
    `FORMAT:\n${ratio} composition.\n${formatRules}`,
    hasReferences
      ? "Reference images are attached. Use the attached logo, product and brand visuals. Do not invent a different logo."
      : "",
    "The result is the social graphic itself, not a mockup of a phone or an Instagram interface.",
  ]);
}

export function buildCarouselImagePrompt({ title, concept, designSystem, slide, slideCount, hasReferences }) {
  const referenceImageInstructions = hasReferences
    ? "Reference images are attached. Use the same logo, product and brand visuals on every slide. Do not invent a different logo."
    : "No reference images are attached. Follow only the carousel design system.";

  return lines([
    `You are creating slide ${slide.index} of ${slideCount} in one consistent Instagram carousel.`,
    `GLOBAL DESIGN SYSTEM:\n${designText(designSystem)}`,
    `CAROUSEL CONCEPT:\nTitle: ${title || ""}\n${concept || ""}`,
    lines([
      "CURRENT SLIDE:",
      `Role: ${slide.type || "content"}`,
      `Headline, render this exact text: ${slide.headline || ""}`,
      slide.body ? `Body, render this exact text: ${slide.body}` : "",
      slide.visualIdea ? `Visual idea: ${slide.visualIdea}` : "",
    ]),
    "FORMAT:\nInstagram carousel\n1:1\n1080x1080 equivalent composition\nKeep text inside a safe margin of about 8% from each edge.",
    "CONSISTENCY:\nMaintain exactly the same visual identity, colors, typography approach, illustration style, spacing and layout language as the carousel design system.",
    referenceImageInstructions,
    "The result is the slide graphic itself, not a mockup of a phone or an Instagram interface.",
  ]);
}
