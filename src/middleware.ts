import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Protect specific routes from unauthenticated users
  const protectedRoutes = ["/upload", "/history"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    // Check for the auth token
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      // Missing token, redirect to login
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  // Prevent logged-in users from accessing login/signup pages
  const authRoutes = ["/auth/signin", "/auth/signup"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isAuthRoute) {
    const token = request.cookies.get("auth_token")?.value;
    if (token) {
      // Already logged in, redirect to upload
      return NextResponse.redirect(new URL("/upload", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/upload/:path*", "/history/:path*", "/auth/:path*"],
};
