import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback", "/setup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Runs in proxy.ts for every app request:
 *  1. Refreshes the Supabase session cookie (required for SSR auth to work).
 *  2. Redirects anonymous users to /login (preserving the target as ?next=).
 *  3. Redirects signed-in users away from /login.
 *
 * This is a UX/optimistic layer only. Real authorization happens in server
 * components, server actions and route handlers via lib/auth.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    if (pathname === "/setup") return NextResponse.next({ request });
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  if (pathname === "/setup") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // Do not run any code between createServerClient and getUser(): the token
  // refresh happens here and cookies must propagate to the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
