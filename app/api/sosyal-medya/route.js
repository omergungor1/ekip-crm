import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/isAdmin";
import { generateContent } from "@/lib/omnistudio";
import { assertProjectAccess, readSocialRequest, saveSocialContent, socialError } from "@/lib/socialSave";

export const maxDuration = 300;

export async function POST(request) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const parsed = await readSocialRequest(request);
  if (parsed.error) return parsed.error;

  try {
    const profile = await assertProjectAccess(supabase, user, parsed.projectId);
    const result = await generateContent(parsed.prompt, parsed.referenceImages);
    const item = await saveSocialContent(supabase, {
      projectId: parsed.projectId,
      kind: result.kind,
      prompt: parsed.prompt,
      body: result.kind === "text" ? result.text : result.text || null,
      createdBy: profile.id,
      buffer: result.buffer,
      contentType: result.contentType,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return socialError(error, "İçerik üretilemedi.");
  }
}
