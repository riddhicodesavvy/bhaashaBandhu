import { z } from 'zod';
import { normalizeIndicText } from '../shared/types';

/**
 * Sanitizing string transform that normalizes Indic Unicode (NFC)
 * and strips zero-width and other invisible control characters.
 */
const sanitizedText = (minLen: number, maxLen: number) =>
  z.string()
    .transform(normalizeIndicText)
    .refine(s => s.length >= minLen && s.length <= maxLen, {
      message: `Text must be between ${minLen} and ${maxLen} characters.`
    });

export const localeSchema = z.enum(['en', 'hi', 'bn']);

export const originalSchema = z.object({
  title: sanitizedText(2, 200),
  instructions: sanitizedText(3, 6000),
  safetyNotes: z.string().transform(normalizeIndicText).refine(s => s.length <= 3000, {
    message: 'Safety notes cannot exceed 3000 characters.'
  }).default('')
});

export const taskInput = z.object({
  assignedTo: z.string().min(1).max(128),
  original: originalSchema,
  sourceLanguage: localeSchema,
  deadline: z.iso.datetime(),
  location: sanitizedText(1, 300),
  previewToken: z.string().max(200000).optional()
});

export const previewInput = z.object({
  assignedTo: z.string().min(1).max(128),
  original: originalSchema,
  sourceLanguage: localeSchema
});

export const incidentInput = z.object({
  originalText: sanitizedText(5, 6000),
  sourceLanguage: localeSchema,
  category: z.enum(['injury', 'hazard', 'unsafe_condition', 'near_miss', 'other']),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  location: sanitizedText(2, 300),
  requestId: z.uuid()
});

export const wageInput = z.object({
  workerId: z.string().min(1).max(128),
  workDate: z.iso.date(),
  dailyRate: z.number().min(0).max(100000),
  daysWorked: z.number().min(0).max(31),
  overtimeHours: z.number().min(0).max(200),
  overtimeRate: z.number().min(0).max(100000),
  deductions: z.number().min(0).max(100000),
  deductionReason: z.string().transform(normalizeIndicText).refine(s => s.length <= 300, {
    message: 'Deduction reason cannot exceed 300 characters.'
  }),
  paidAmount: z.number().min(0).max(10000000),
  source: z.enum(['recorded', 'agreed'])
}).refine(v => v.deductions === 0 || v.deductionReason.trim().length > 0, {
  message: 'Explain deductions',
  path: ['deductionReason']
});
