import { z } from "zod";

export const createUploadSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).default(""),
  category: z.enum(["Culture", "Design", "Technology", "Travel", "Education", "Entertainment", "News", "Other"]),
  visibility: z.enum(["public", "private"]).default("public"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
  fileSize: z.number().int().positive().max(200 * 1024 * 1024)
});

export const publishSchema = z.object({
  videoId: z.string().uuid(),
  visibility: z.enum(["public", "private"])
});
