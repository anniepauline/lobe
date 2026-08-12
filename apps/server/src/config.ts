import { z } from "zod";

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  APP_ORIGIN: z.url().default("http://localhost:5173"),
  LOBE_API_TOKEN: z.string().min(8).default("lobe-local-dev"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const environment = environmentSchema.parse(process.env);

if (
  environment.NODE_ENV === "production" &&
  environment.LOBE_API_TOKEN === "lobe-local-dev"
) {
  throw new Error("LOBE_API_TOKEN must be configured in production");
}

export const serverConfig = {
  port: environment.API_PORT,
  appOrigin: environment.APP_ORIGIN,
  apiToken: environment.LOBE_API_TOKEN,
  nodeEnv: environment.NODE_ENV,
} as const;
