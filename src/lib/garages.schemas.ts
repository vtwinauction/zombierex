/** Zod schemas for garage discovery, profiles and bookings. Client-safe. */
import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/garage-taxonomy";

export const GarageSearchInput = z.object({
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  q: z.string().trim().max(80).optional(),
  specialties: z.array(z.string().trim().max(40)).max(12).optional(),
  vehicle_type: z.string().trim().max(30).optional(),
  brand: z.string().trim().max(40).optional(),
  emergency: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const GarageProfileInput = z
  .object({
    slug: z.string().trim().min(1).max(64).optional(),
    id: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.slug || v.id), { message: "slug or id required" });

export const AvailabilityInput = z.object({
  vendor_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const DayWindow = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

export const GarageBusinessInput = z.object({
  specialties: z.array(z.string().trim().max(40)).max(20).optional(),
  brands: z.array(z.string().trim().max(40)).max(60).optional(),
  vehicle_types: z.array(z.string().trim().max(30)).max(10).optional(),
  emergency_service: z.boolean().optional(),
  response_time_mins: z.number().int().min(1).max(10080).nullable().optional(),
  price_from_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  payment_methods: z.array(z.string().trim().max(30)).max(10).optional(),
  booking_enabled: z.boolean().optional(),
  certifications: z
    .array(z.object({ title: z.string().trim().max(120), issuer: z.string().trim().max(120).optional() }))
    .max(20)
    .optional(),
  team: z
    .array(
      z.object({
        name: z.string().trim().max(80),
        role: z.string().trim().max(80).optional(),
        avatar_url: z.string().url().max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
  policies: z.record(z.string(), z.string().max(600)).optional(),
  availability: z
    .object({
      slot_minutes: z.number().int().min(15).max(240).optional(),
      days: z.record(z.string(), DayWindow).optional(),
    })
    .optional(),
});

export const ServiceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).nullable().optional(),
  price_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  duration_minutes: z.number().int().min(5).max(2880).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const ServiceIdInput = z.object({ id: z.string().uuid() });

export const CreateBookingInput = z.object({
  vendor_id: z.string().uuid(),
  service_ids: z.array(z.string().uuid()).max(10).default([]),
  vehicle_id: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  problem_text: z.string().trim().max(2000).optional(),
  media: z.array(z.string().url().max(1000)).max(8).optional(),
  quote_requested: z.boolean().optional(),
  contact_phone: z.string().trim().max(40).optional(),
});

export const BookingIdInput = z.object({ id: z.string().uuid() });

export const UpdateBookingStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(500).optional(),
  scheduled_at: z.string().datetime().optional(),
});

export const SendQuoteInput = z.object({
  id: z.string().uuid(),
  quote_cents: z.number().int().min(0).max(100_000_000),
  quote_notes: z.string().trim().max(1000).optional(),
});

export const QuoteDecisionInput = z.object({
  id: z.string().uuid(),
  accept: z.boolean(),
});

export const WorkMediaInput = z.object({
  id: z.string().uuid(),
  urls: z.array(z.string().url().max(1000)).min(1).max(10),
  caption: z.string().trim().max(200).optional(),
});
