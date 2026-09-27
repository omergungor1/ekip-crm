import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/isAdmin";
import { completeChat } from "@/lib/omnistudio";
import { loadWritableProject, socialError } from "@/lib/socialSave";
import { getContentMode, resolveRatio, resolveSize } from "@/lib/social-media/contentModes";
import { creativeMessages, carouselMessages, formatRulesFor, parseModelJson } from "@/lib/social-media/promptBuilder";
import { creativeCaption, normalizeCarouselPlan, normalizeCreativeBrief } from "@/lib/social-media/carouselPlanner";
import { buildDirectedImagePrompt } from "@/lib/social-media/imagePromptBuilder";

export const maxDuration = 300;

async function readPlan(messages, normalize) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return normalize(parseModelJson(await completeChat(messages)));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const mode = getContentMode(String(body?.mode || ""));
  const projectId = String(body?.projectId || "").trim();
  const idea = String(body?.prompt || "").trim();
  const adFormat = ["post", "story", "landscape"].includes(body?.adFormat) ? body.adFormat : "post";
  const requestedSlides = body?.slideCount;
  const slideCount = requestedSlides == null || requestedSlides === "auto" ? null : Number(requestedSlides);

  if (!mode || mode.id === "free" || !mode.planner) {
    return NextResponse.json({ error: "Bu mod planlanamıyor." }, { status: 400 });
  }
  if (!PROJECT_ID.test(projectId)) return NextResponse.json({ error: "Proje seçin." }, { status: 400 });
  if (!idea) return NextResponse.json({ error: "Bir istek yazın." }, { status: 400 });
  if (idea.length > 2000) return NextResponse.json({ error: "İstek çok uzun." }, { status: 400 });
  if (mode.id === "carousel" && slideCount != null && (!Number.isInteger(slideCount) || slideCount < 3 || slideCount > 10)) {
    return NextResponse.json({ error: "Slayt sayısı geçersiz." }, { status: 400 });
  }

  try {
    const { project } = await loadWritableProject(supabase, user, projectId);
    const brand = { name: project?.name || "Marka", description: project?.description || "" };
    const hasReferences = Boolean(body?.hasReferences) || Boolean(project?.logo_url);
    const ratio = resolveRatio(mode.id, adFormat);

    if (mode.planner === "carousel") {
      const plan = await readPlan(
        carouselMessages({ idea, brand, slideCount, hasReferences }),
        (raw) => normalizeCarouselPlan(raw, slideCount),
      );
      return NextResponse.json({ mode: mode.id, plan });
    }

    const brief = await readPlan(
      creativeMessages({ mode, idea, brand, adFormat, hasReferences, ratio }),
      normalizeCreativeBrief,
    );
    const imagePrompt = buildDirectedImagePrompt({
      modeLabel: mode.label,
      ratio,
      formatRules: formatRulesFor(mode.id, adFormat),
      brief,
      brand,
      hasReferences,
    });
    return NextResponse.json({
      mode: mode.id,
      size: resolveSize(mode.id, adFormat),
      plan: {
        headline: brief.headline,
        subheadline: brief.subheadline,
        cta: brief.cta,
        caption: creativeCaption(brief),
        imagePrompt,
      },
    });
  } catch (error) {
    return socialError(error, "Plan oluşturulamadı.");
  }
}
