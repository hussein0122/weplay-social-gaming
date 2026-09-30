import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/avatar/:path*",
    "/friends/:path*",
    "/lobby/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/rankings/:path*",
    "/report/:path*",
    "/rewards/:path*",
    "/rooms/:path*",
    "/safety/:path*",
    "/settings/:path*",
    "/stats/:path*",
  ],
};
