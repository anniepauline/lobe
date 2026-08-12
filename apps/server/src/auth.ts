import { createMiddleware } from "hono/factory";

import { serverConfig } from "./config";

function getBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

export const requireAuth = createMiddleware(async (context, next) => {
  const token = getBearerToken(context.req.header("Authorization"));

  if (token !== serverConfig.apiToken) {
    return context.json(
      {
        error: {
          code: "unauthorized",
          message: "A valid Lobe API token is required.",
        },
      },
      401,
    );
  }

  await next();
});
