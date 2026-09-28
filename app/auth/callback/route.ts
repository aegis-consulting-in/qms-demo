import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth redirect target (password recovery, magic links, invites).
 * Exchanges the one-time `code` for a session cookie, then forwards to `next`.
 * Configure this URL in Supabase → Authentication → URL Configuration.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const url = new URL("/login", origin);
  url.searchParams.set("message", "The sign-in link is invalid or has expired. Please try again.");
  return NextResponse.redirect(url);
}
