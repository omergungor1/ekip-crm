import { normalizeCanvasData } from "@/lib/roadmap/utils";

const MAX_REVISIONS = 20;

function isCanvasEmpty(canvasData) {
  const data = normalizeCanvasData(canvasData);
  return (
    data.nodes.length === 0 &&
    data.edges.length === 0 &&
    data.annotations.length === 0
  );
}

function countNodes(canvasData) {
  return normalizeCanvasData(canvasData).nodes.length;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

async function trimRevisions(supabase, { userId, projectId, workspaceId }) {
  let query = supabase
    .from("roadmap_revisions")
    .select("id")
    .order("created_at", { ascending: false });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", userId).is("project_id", null);
  }

  const { data, error } = await query;
  if (error || !data || data.length <= MAX_REVISIONS) return;

  const staleIds = data.slice(MAX_REVISIONS).map((row) => row.id);
  await supabase.from("roadmap_revisions").delete().in("id", staleIds);
}

async function ensureDailyBackup(supabase, { userId, projectId, workspaceId, canvasData, nodeCount }) {
  const backupDate = todayUtc();
  let query = supabase
    .from("roadmap_daily_backups")
    .select("id")
    .eq("backup_date", backupDate);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", userId).is("project_id", null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return;

  await supabase.from("roadmap_daily_backups").insert({
    user_id: userId,
    project_id: projectId,
    workspace_id: workspaceId,
    backup_date: backupDate,
    canvas_data: canvasData,
    node_count: nodeCount,
  });
}

export async function backupRoadmapRevision(supabase, { userId, projectId = null, workspaceId = null, canvasData }) {
  if (isCanvasEmpty(canvasData)) return;

  const normalized = normalizeCanvasData(canvasData);
  const nodeCount = normalized.nodes.length;

  const { error } = await supabase.from("roadmap_revisions").insert({
    user_id: userId,
    project_id: projectId,
    workspace_id: workspaceId,
    canvas_data: normalized,
    node_count: nodeCount,
  });

  if (error) {
    console.error("roadmap revision backup failed:", error.message);
    return;
  }

  await trimRevisions(supabase, { userId, projectId, workspaceId });
  await ensureDailyBackup(supabase, {
    userId,
    projectId,
    workspaceId,
    canvasData: normalized,
    nodeCount,
  });
}

export async function listRoadmapRevisions(supabase, { userId, projectId = null, workspaceId = null }) {
  let revisionQueryBuilder = supabase
    .from("roadmap_revisions")
    .select("id, node_count, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_REVISIONS);

  let dailyQueryBuilder = supabase
    .from("roadmap_daily_backups")
    .select("id, backup_date, node_count, created_at")
    .order("backup_date", { ascending: false });

  if (workspaceId) {
    revisionQueryBuilder = revisionQueryBuilder.eq("workspace_id", workspaceId);
    dailyQueryBuilder = dailyQueryBuilder.eq("workspace_id", workspaceId);
  } else if (projectId) {
    revisionQueryBuilder = revisionQueryBuilder.eq("project_id", projectId);
    dailyQueryBuilder = dailyQueryBuilder.eq("project_id", projectId);
  } else {
    revisionQueryBuilder = revisionQueryBuilder.eq("user_id", userId).is("project_id", null);
    dailyQueryBuilder = dailyQueryBuilder.eq("user_id", userId).is("project_id", null);
  }

  const [revisionsRes, dailyRes] = await Promise.all([revisionQueryBuilder, dailyQueryBuilder]);

  if (revisionsRes.error) throw new Error(revisionsRes.error.message);
  if (dailyRes.error) throw new Error(dailyRes.error.message);

  return {
    revisions: revisionsRes.data || [],
    daily_backups: dailyRes.data || [],
  };
}

export async function getRevisionCanvas(supabase, { userId, projectId = null, workspaceId = null, source, id }) {
  if (source === "daily") {
    let query = supabase
      .from("roadmap_daily_backups")
      .select("id, canvas_data")
      .eq("id", id);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.eq("user_id", userId).is("project_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Günlük yedek bulunamadı");
    return normalizeCanvasData(data.canvas_data);
  }

  let query = supabase
    .from("roadmap_revisions")
    .select("id, canvas_data")
    .eq("id", id);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", userId).is("project_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Revizyon bulunamadı");
  return normalizeCanvasData(data.canvas_data);
}
