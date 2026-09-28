import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAction } from "@/lib/audit-log";
import { DOCUMENTS_BUCKET } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/documents/:id/download[?inline=1]
 *
 * The only way a browser ever reaches a stored file:
 *   1. Authenticate the session.
 *   2. Require documents.download.
 *   3. Load the document row through the caller's RLS-protected client. If RLS
 *      hides the row, the user cannot see the entity → 404 (no existence leak).
 *   4. Mint a 60-second signed URL and redirect.
 *
 * Guessing another document's UUID gives 404; guessing a storage path gives
 * nothing because the bucket is private.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.can(PERMISSIONS.documents.download)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, storage_path, file_name, mime_type, module, entity_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inline = request.nextUrl.searchParams.get("inline") === "1";
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS, inline ? undefined : { download: doc.file_name });
  if (signError || !signed) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  await logAction(supabase, inline ? "document.viewed" : "document.downloaded", { type: "document", id: doc.id }, {
    module: doc.module,
    entity_id: doc.entity_id,
    file_name: doc.file_name,
  });

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
