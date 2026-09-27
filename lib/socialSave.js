import { NextResponse } from "next/server";

const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function readSocialRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }) };
  }

  const prompt = String(body?.prompt || "").trim();
  const projectId = String(body?.projectId || "").trim();
  if (!PROJECT_ID.test(projectId)) {
    return { error: NextResponse.json({ error: "Proje seçin." }, { status: 400 }) };
  }
  if (!prompt) return { error: NextResponse.json({ error: "Bir istek yazın." }, { status: 400 }) };
  if (prompt.length > 2000) return { error: NextResponse.json({ error: "İstek çok uzun." }, { status: 400 }) };

  const incoming = Array.isArray(body?.referenceImages) ? body.referenceImages : [];
  if (incoming.length > 8) {
    return { error: NextResponse.json({ error: "En fazla 8 referans görsel eklenebilir." }, { status: 400 }) };
  }
  const referenceImages = [];
  for (const item of incoming) {
    if (typeof item !== "string") {
      return { error: NextResponse.json({ error: "Referans görsel okunamadı." }, { status: 400 }) };
    }
    const value = item.trim();
    const dataUrl = value.startsWith("data:image/") && value.includes(";base64,");
    const remote = /^https?:\/\//.test(value);
    if ((!dataUrl && !remote) || value.length > 2500000) {
      return { error: NextResponse.json({ error: "Referans görsel çok büyük veya geçersiz." }, { status: 400 }) };
    }
    referenceImages.push(value);
  }
  return { prompt, projectId, referenceImages };
}

export async function assertProjectAccess(supabase, user, projectId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.is_active || (profile.role !== "admin" && profile.role !== "member")) {
    const denied = new Error("Bu işlem için yetkin yok.");
    denied.status = 403;
    throw denied;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) {
    const missing = new Error("Proje bulunamadı.");
    missing.status = 404;
    throw missing;
  }
  return profile;
}

export function socialError(error, fallback) {
  const status = error?.status || 502;
  return NextResponse.json({ error: error?.message || fallback }, { status });
}

export async function loadWritableProject(supabase, user, projectId) {
  const profile = await assertProjectAccess(supabase, user, projectId);
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, description, logo_url, color")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return { profile, project };
}

function extensionFor(contentType) {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

const CONTENT_FIELDS = "id, project_id, kind, prompt, body, storage_path, created_at";

export async function saveSocialContent(supabase, { projectId, kind, prompt, body, createdBy, buffer, contentType }) {
  let storagePath = "";
  try {
    const row = {
      project_id: projectId,
      kind,
      prompt,
      body: body || null,
      created_by: createdBy,
    };
    if (kind === "image") {
      storagePath = `${projectId}/${crypto.randomUUID()}.${extensionFor(contentType || "")}`;
      const { error: uploadError } = await supabase.storage.from("social").upload(storagePath, buffer, {
        contentType: contentType || "image/png",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      row.storage_path = storagePath;
    }
    const { data, error } = await supabase.from("social_contents").insert(row).select(CONTENT_FIELDS).single();
    if (error) throw error;
    return data;
  } catch (error) {
    if (storagePath) await supabase.storage.from("social").remove([storagePath]);
    throw error;
  }
}
