import { z } from 'zod';
import { verifyIdentity } from './firebase';
import { AppError } from './errors';
import type { Profile, Session, Store } from '../shared/types';
const profileSchema = z.object({ id: z.string().min(1), role: z.enum(['worker', 'contractor', 'hospital_responder']), siteId: z.string().min(1), displayName: z.string().min(1), preferredLanguage: z.enum(['en', 'hi', 'bn']), isDemo: z.literal(true) });
export function createSessionVerifier(store: Store, identity = verifyIdentity) {
  return async (token: string): Promise<Session> => {
    const { uid } = await identity(token);
    const row = await store.get<Profile>(`profile:${uid}`); const parsed = profileSchema.safeParse(row?.payload);
    if (!row || row.kind !== 'profile' || row.ownerId !== uid || !parsed.success || parsed.data.id !== uid || parsed.data.siteId !== row.siteId) throw new AppError(403, 'PROFILE_NOT_CONFIGURED', 'Firebase sign-in succeeded, but an authorized application profile for this UID has not been configured in Supabase.');
    // Never authorize from email text, request body roles, or client-supplied claims.
    return { uid, role: parsed.data.role, siteId: parsed.data.siteId };
  };
}
