import { createClient } from "@/lib/supabase/client";

const TASK_LIST = `
  id, title, description, status, priority, start_date, due_date, project_id, customer_id, position, created_by, created_at, updated_at,
  project:projects(id, name, color),
  customer:customers(id, company_name),
  assignees:task_assignees(id, profile_id, profile:profiles(id, full_name, avatar_url, username, role)),
  tags:task_tags(tag_id, tag:tags(id, name, color)),
  checklists:task_checklists(id, title, is_done, position),
  creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
`;

const TASK_DETAIL = `
  ${TASK_LIST},
  comments:task_comments(id, body, created_at, profile_id, profile:profiles(id, full_name, avatar_url))
`;

function db() {
  return createClient();
}

export async function listTeam() {
  const { data, error } = await db()
    .from("profiles")
    .select("id, username, full_name, avatar_url, role, job_title, is_active, created_at")
    .order("full_name");
  if (error) throw error;
  return data || [];
}

export async function listEntityActivities(entityType, entityId) {
  const { data, error } = await db()
    .from("activities")
    .select("id, action, entity_type, entity_id, metadata, created_at, profile:profiles(id, full_name, avatar_url)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listProfiles() {
  const { data, error } = await db()
    .from("profiles")
    .select("id, username, full_name, avatar_url, role, job_title, is_active")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data || [];
}

export async function listSocialContents(projectId) {
  const { data, error } = await db()
    .from("social_contents")
    .select("id, project_id, kind, prompt, body, storage_path, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listProjects() {
  const { data, error } = await db()
    .from("projects")
    .select(
      "id, name, description, logo_url, color, status, start_date, manager_id, created_by, created_at, manager:profiles!projects_manager_id_fkey(id, full_name, avatar_url), members:project_members(profile_id, profile:profiles(id, full_name, avatar_url, role, job_title))"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProject(id) {
  const { data, error } = await db()
    .from("projects")
    .select(
      "id, name, description, logo_url, color, status, start_date, manager_id, created_by, created_at, manager:profiles!projects_manager_id_fkey(id, full_name, avatar_url, job_title), members:project_members(id, profile_id, profile:profiles(id, full_name, avatar_url, role, job_title))"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCustomers() {
  const { data, error } = await db()
    .from("customers")
    .select(
      "id, company_name, contact_name, phone, email, address, website, owner_id, status, note, created_at, owner:profiles!customers_owner_id_fkey(id, full_name, avatar_url), tags:customer_tags(tag_id, tag:tags(id, name, color)), projects:customer_projects(project_id, project:projects(id, name, color, status))"
    )
    .order("company_name");
  if (error) throw error;
  return data || [];
}

export async function getCustomer(id) {
  const { data, error } = await db()
    .from("customers")
    .select(
      "id, company_name, contact_name, phone, email, address, website, owner_id, status, note, created_by, created_at, owner:profiles!customers_owner_id_fkey(id, full_name, avatar_url), tags:customer_tags(tag_id, tag:tags(id, name, color)), projects:customer_projects(id, project_id, project:projects(id, name, color, status))"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listTags() {
  const { data, error } = await db().from("tags").select("id, name, color").order("name");
  if (error) throw error;
  return data || [];
}

export async function listTasks() {
  const { data, error } = await db().from("tasks").select(TASK_LIST).order("position");
  if (error) throw error;
  return (data || []).map(normalizeTask);
}

export async function getTask(id) {
  const { data, error } = await db().from("tasks").select(TASK_DETAIL).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeTask(data) : null;
}

export function normalizeTask(task) {
  return {
    ...task,
    assignees: (task.assignees || []).map((row) => row.profile).filter(Boolean),
    assigneeIds: (task.assignees || []).map((row) => row.profile_id),
    tags: (task.tags || []).map((row) => row.tag).filter(Boolean),
    tagIds: (task.tags || []).map((row) => row.tag_id),
    checklists: [...(task.checklists || [])].sort((a, b) => a.position - b.position),
    comments: [...(task.comments || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    ),
  };
}

export async function listGoals() {
  const { data, error } = await db()
    .from("goals")
    .select("id, title, description, start_date, end_date, target_value, current_value, status, project_id, created_at, project:projects(id, name, color)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listSubscriptions() {
  const { data, error } = await db()
    .from("subscriptions")
    .select(
      "id, customer_id, project_id, package_name, monthly_fee, currency, start_date, next_renewal_date, status, note, created_at, customer:customers(id, company_name), project:projects(id, name, color)"
    )
    .order("next_renewal_date");
  if (error) throw error;
  return data || [];
}

export async function listActivities(limit = 12) {
  const { data, error } = await db()
    .from("activities")
    .select("id, action, entity_type, entity_id, metadata, created_at, profile:profiles(id, full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function logActivity(profileId, action, entityType, entityId, metadata = {}) {
  const { error } = await db().from("activities").insert({
    profile_id: profileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) throw error;
}

export async function replaceLinks(table, parentColumn, parentId, childColumn, ids) {
  const client = db();
  const { error: deleteError } = await client.from(table).delete().eq(parentColumn, parentId);
  if (deleteError) throw deleteError;
  if (!ids?.length) return;
  const rows = ids.map((id) => ({ [parentColumn]: parentId, [childColumn]: id }));
  const { error } = await client.from(table).insert(rows);
  if (error) throw error;
}

export async function listNotes(table, column, id) {
  const { data, error } = await db()
    .from(table)
    .select("id, body, created_at, profile:profiles(id, full_name, avatar_url)")
    .eq(column, id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAttachments(entityType, entityId) {
  const { data, error } = await db()
    .from("attachments")
    .select("id, filename, storage_path, mime_type, size, created_at, uploaded_by, uploader:profiles!attachments_uploaded_by_fkey(id, full_name, avatar_url)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export { db };
