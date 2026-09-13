export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/api/chat/:path*", "/api/strategist/:path*", "/api/memory/:path*", "/api/billing/:path*", "/api/attachments/:path*"],
};
