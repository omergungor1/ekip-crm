import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/isAdmin";
import { emptyCanvasData } from "@/lib/roadmap/constants";
import { contentFingerprint, normalizeCanvasData } from "@/lib/roadmap/utils";
import { isCanvasContentEmpty } from "@/lib/roadmap/mergeCanvas";
import { backupRoadmapRevision } from "@/lib/roadmap/revisionsServer";

const WORKSPACE_ID = "main";

function workspacePayload(row) {
  const canvas_data = normalizeCanvasData(row?.canvas_data || emptyCanvasData());
  return {
    canvas_data,
    revision: row?.revision ?? 0,
    updated_at: row?.updated_at ?? null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { data, error } = await supabase
    .from("shared_roadmaps")
    .select("canvas_data, revision, updated_at")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(workspacePayload(data));
}

export async function PUT(request) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  if (!body.canvas_data || typeof body.canvas_data !== "object" || Array.isArray(body.canvas_data)) {
    return NextResponse.json({ error: "Tuval verisi eksik" }, { status: 400 });
  }

  const baseRevision = Number(body.base_revision);
  if (!Number.isInteger(baseRevision) || baseRevision < 0) {
    return NextResponse.json({ error: "Tuval sürümü eksik. Kayıt yapılmadı." }, { status: 400 });
  }

  const canvas_data = normalizeCanvasData(body.canvas_data);
  const { data: current, error: readError } = await supabase
    .from("shared_roadmaps")
    .select("canvas_data, revision, updated_at")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  if (current && current.revision !== baseRevision) {
    return NextResponse.json(
      { error: "Tuval başka bir ekranda güncellendi", ...workspacePayload(current) },
      { status: 409 }
    );
  }

  const incomingEmpty = isCanvasContentEmpty(canvas_data);
  const currentEmpty = !current || isCanvasContentEmpty(normalizeCanvasData(current.canvas_data));
  if (incomingEmpty && !currentEmpty && body.confirm_empty !== true) {
    return NextResponse.json(
      { error: "Boş tuval mevcut çalışmanın üzerine yazılmadı", ...workspacePayload(current) },
      { status: 422 }
    );
  }

  if (
    current &&
    contentFingerprint(current.canvas_data) === contentFingerprint(canvas_data)
  ) {
    return NextResponse.json(workspacePayload(current));
  }

  const nextRevision = (current?.revision ?? 0) + 1;
  const patch = {
    canvas_data,
    revision: nextRevision,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const write = current
    ? supabase
        .from("shared_roadmaps")
        .update(patch)
        .eq("id", WORKSPACE_ID)
        .eq("revision", baseRevision)
        .select("canvas_data, revision, updated_at")
        .maybeSingle()
    : supabase
        .from("shared_roadmaps")
        .insert({ id: WORKSPACE_ID, ...patch })
        .select("canvas_data, revision, updated_at")
        .maybeSingle();

  const { data, error } = await write;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    const { data: latest } = await supabase
      .from("shared_roadmaps")
      .select("canvas_data, revision, updated_at")
      .eq("id", WORKSPACE_ID)
      .maybeSingle();
    return NextResponse.json(
      { error: "Tuval başka bir ekranda güncellendi", ...workspacePayload(latest) },
      { status: 409 }
    );
  }

  if (current?.canvas_data) {
    await backupRoadmapRevision(supabase, {
      userId: user.id,
      workspaceId: WORKSPACE_ID,
      canvasData: current.canvas_data,
    });
  }

  return NextResponse.json(workspacePayload(data));
}
