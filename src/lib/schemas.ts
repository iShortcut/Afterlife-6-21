// src/lib/schemas.ts
import { z } from 'zod';

export const eventBasicInfoSchema = z.object({
  title: z.string().min(3, 'Event title must be at least 3 characters').max(150),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  location_text: z.string().min(5, 'Location must be at least 5 characters').nullable(),
  visibility: z.enum(['public', 'family_only', 'invitees_only']).default('public'),
  location_type: z.enum(['physical', 'online']).default('physical'),
  event_type_id: z.string().min(1, 'Please select an event type'),
  cover_image_file: z.any().optional(),
  invited_emails: z.array(z.string().email()).default([]),
  location_latitude: z.number().optional().nullable(),
  location_longitude: z.number().optional().nullable(),
  tags: z.array(z.string()).default([])
}).refine(data => {
  // Checks if end_time exists and is after start_time
  if (data.end_time && data.start_time) {
    return new Date(data.end_time) > new Date(data.start_time);
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["end_time"] // Path of the error
});

export type EventBasicInfoFormData = z.infer<typeof eventBasicInfoSchema>;