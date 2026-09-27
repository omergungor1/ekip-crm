import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/isAdmin";
import { generateContent } from "@/lib/omnistudio";
import { loadWritableProject, saveSocialContent, socialError } from "@/lib/socialSave";
import { getContentMode, resolveSize } from "@/lib/social-media/contentModes";
import { buildCarouselImagePrompt } from "@/lib/social-media/imagePromptBuilder";
import { normalizeDesignSystem } from "@/lib/social-media/carouselPlanner";

export const maxDuration = 300;

const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIZES = new Set(["1024x1024", "1024x1792", "1792x1024"]);

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

async function readBody(request) {
  try {
    return { body: await request.json() };
  } catch {
    return { error: NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }) };
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const parsed = await readBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const mode = getContentMode(String(body?.mode || ""));
  const projectId = String(body?.projectId || "").trim();
  if (!mode || mode.imageGeneration === "direct") {
    return NextResponse.json({ error: "Bu mod buradan üretilemiyor." }, { status: 400 });
  }
  if (!PROJECT_ID.test(projectId)) return NextResponse.json({ error: "Proje seçin." }, { status: 400 });

  const incoming = Array.isArray(body?.referenceImages) ? body.referenceImages : [];
  if (incoming.length > 8) return NextResponse.json({ error: "En fazla 8 referans görsel eklenebilir." }, { status: 400 });
  const referenceImages = [];
  for (const item of incoming) {
    if (typeof item !== "string") return NextResponse.json({ error: "Referans görsel okunamadı." }, { status: 400 });
    const value = item.trim();
    const dataUrl = value.startsWith("data:image/") && value.includes(";base64,");
    const remote = /^https?:\/\//.test(value);
    if ((!dataUrl && !remote) || value.length > 2500000) {
      return NextResponse.json({ error: "Referans görsel çok büyük veya geçersiz." }, { status: 400 });
    }
    referenceImages.push(value);
  }

  const adFormat = ["post", "story", "landscape"].includes(body?.adFormat) ? body.adFormat : "post";
  const recordPrompt = clip(body?.recordPrompt, 2000);
  const recordBody = clip(body?.recordBody, 2000);
  if (!recordPrompt) return NextResponse.json({ error: "Bir istek yazın." }, { status: 400 });

  try {
    const { profile, project } = await loadWritableProject(supabase, user, projectId);
    if (project?.logo_url && !referenceImages.includes(project.logo_url) && referenceImages.length < 8) {
      referenceImages.unshift(project.logo_url);
    }

    let imagePrompt = "";
    let size = resolveSize(mode.id, adFormat);
    if (mode.id === "carousel") {
      const slide = body?.slide && typeof body.slide === "object" ? body.slide : null;
      const plan = body?.plan && typeof body.plan === "object" ? body.plan : null;
      if (!slide || !plan) return NextResponse.json({ error: "Slayt planı eksik." }, { status: 400 });
      const slideCount = Math.min(10, Math.max(1, Number(body?.slideCount) || 1));
      imagePrompt = buildCarouselImagePrompt({
        title: clip(plan.title, 160),
        concept: clip(plan.concept, 600),
        designSystem: normalizeDesignSystem(plan),
        slide: {
          index: Math.min(10, Math.max(1, Number(slide.index) || 1)),
          type: clip(slide.type, 20),
          headline: clip(slide.headline, 180),
          body: clip(slide.body, 400),
          visualIdea: clip(slide.visualIdea, 800),
        },
        slideCount,
        hasReferences: referenceImages.length > 0,
      });
      size = "1024x1024";
    } else {
      imagePrompt = clip(body?.imagePrompt, 12000);
      if (!imagePrompt) return NextResponse.json({ error: "Görsel planı eksik." }, { status: 400 });
      if (body?.size && SIZES.has(body.size)) size = body.size;
    }

    const result = await generateContent(imagePrompt, referenceImages, { size });
    if (result.kind !== "image") throw new Error("Servis görsel döndürmedi.");
    const item = await saveSocialContent(supabase, {
      projectId,
      kind: "image",
      prompt: recordPrompt,
      body: recordBody || result.text || null,
      createdBy: profile.id,
      buffer: result.buffer,
      contentType: result.contentType,
    });
    return NextResponse.json({ item, size });
  } catch (error) {
    return socialError(error, "Görsel üretilemedi.");
  }
}
