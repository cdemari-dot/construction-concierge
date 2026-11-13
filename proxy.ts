import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/accept-invite"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    // Let pages render their own "connect Supabase" setup banner instead of
    // redirect-looping before a project is configured.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user) {
    if (!isPublic && pathname !== "/") return redirectTo(request, "/login");
    return response;
  }

  // Signed in. /onboarding is where an authenticated user with no `profiles`
  // row yet (signup requires email confirmation, so the company/profile
  // can't be created until the *next* sign-in, after confirming) finishes
  // setup — never redirect away from it based on profile state, or a user
  // who hasn't finished onboarding would bounce in a loop between here and
  // whatever page sent them to /login.
  if (pathname === "/onboarding") return response;

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();

  if (!profile) return redirectTo(request, "/onboarding");

  if (isPublic) return redirectTo(request, "/dashboard");

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, so the Supabase session
     * cookie stays refreshed on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
