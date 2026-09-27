import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/isAdmin";
import { normalizeCanvasData } from "@/lib/roadmap/utils";
import {
  backupRoadmapRevision,
  getRevisionCanvas,
  listRoadmapRevisions,
} from "@/lib/roadmap/revisionsServer";

export async function GET() {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const data = await listRoadmapRevisions(supabase, { userId: user.id, workspaceId: "main" });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await request.json();
  const source = body.source === "daily" ? "daily" : "revision";
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  try {
    const { data: current } = await supabase
      .from("shared_roadmaps")
      .select("canvas_data, revision")
      .eq("id", "main")
      .maybeSingle();

    if (current?.canvas_data) {
      await backupRoadmapRevision(supabase, {
        userId: user.id,
        workspaceId: "main",
        canvasData: current.canvas_data,
      });
    }

    const canvas_data = await getRevisionCanvas(supabase, {
      userId: user.id,
      workspaceId: "main",
      source,
      id,
    });

    const nextRevision = (current?.revision ?? 0) + 1;
    const { data, error } = await supabase
      .from("shared_roadmaps")
      .update({
        canvas_data,
        revision: nextRevision,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", "main")
      .eq("revision", current?.revision ?? 0)
      .select("canvas_data, revision, updated_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) {
      return NextResponse.json({ error: "Tuval aynı anda güncellendi. Tekrar deneyin." }, { status: 409 });
    }
    return NextResponse.json({
      canvas_data: normalizeCanvasData(data.canvas_data),
      revision: data.revision,
      updated_at: data.updated_at,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
