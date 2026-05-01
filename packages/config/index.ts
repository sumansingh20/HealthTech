import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// MongoDB SRV connection string regex pattern for validation
const mongoDbSrvPattern = /^mongodb\+srv:\/\/[^:]+:[^@]+@[^/]+\/.*/;
const mongoDbPattern = /^mongodb:\/\/[^:]+:[^@]+@[^/]+\/.*/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  // MongoDB URI - supports both standard and SRV connections
  MONGODB_URI: z.string().refine(
    (val) => mongoDbSrvPattern.test(val) || mongoDbPattern.test(val) || val.startsWith('mongodb://'),
    { message: 'Invalid MongoDB connection string' }
  ),
  // Alternate MongoDB URI for specific services (optional)
  MONGODB_ATLAS_URI: z.string().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  API_GATEWAY_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  PATIENT_SERVICE_URL: z.string().url(),
  VITALS_SERVICE_URL: z.string().url(),
  ML_SERVICE_URL: z.string().url(),
  IOT_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url(),
  ANALYTICS_SERVICE_URL: z.string().url(),
  AUDIT_SERVICE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  TWILIO_SID: z.string().optional(),
  TWILIO_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional()
});

export const env = envSchema.parse(process.env);

/**
 * Get MongoDB connection URI with support for both Atlas SRV and local connections
 * Priority: MONGODB_ATLAS_URI > MONGODB_URI
 * @returns The MongoDB connection URI string
 */
export function getMongoDbUri(): string {
  return process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || '';
}

/**
 * Check if using MongoDB Atlas (SRV connection)
 */
export function isMongoDbAtlas(): boolean {
  const uri = getMongoDbUri();
  return uri.startsWith('mongodb+srv://');
}
