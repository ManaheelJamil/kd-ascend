/**
 * Identity documents for "Verify Your Identity" (sign-up step 2) and Resubmit.
 * Rule: at least one of Student Pass / Identity Card (IC), each with BOTH the front and back side.
 * Saved as users/{uid}.identityDocuments = { studentPass?: { front, back }, ic?: { front, back } }.
 * identityDocument (single file) is still written with the first front side for older screens.
 */
import { uploadUserFile, type PickedFile } from './storageService';
import type { StoredFile, UserDoc } from './userService';

export type DocKind = 'studentPass' | 'ic';
export type DocSide = 'front' | 'back';
export type IdentityDocuments = Partial<Record<DocKind, { front: StoredFile; back: StoredFile }>>;

export const ID_DOCS: { key: DocKind; label: string }[] = [
  { key: 'studentPass', label: 'Student Pass' },
  { key: 'ic', label: 'Identity Card (IC)' },
];
export const SIDE_LABEL: Record<DocSide, string> = { front: 'Front Side', back: 'Back Side' };

/** A side is either a file already saved (StoredFile) or one just picked on the phone (PickedFile). */
export type DraftFile = StoredFile | PickedFile;
export type IdDraft = Record<DocKind, Record<DocSide, DraftFile | null>>;

const isPicked = (f: DraftFile): f is PickedFile => 'uri' in f && !('path' in f);

/** What the user already uploaded, so the screen opens pre-filled. */
export function draftFromProfile(p: UserDoc | null | undefined): IdDraft {
  const d = p?.identityDocuments;
  const draft: IdDraft = {
    studentPass: { front: d?.studentPass?.front ?? null, back: d?.studentPass?.back ?? null },
    ic: { front: d?.ic?.front ?? null, back: d?.ic?.back ?? null },
  };
  // Accounts from before front / back: show the single old document as a front side.
  if (!d && p?.identityDocument) {
    const kind: DocKind = /student/i.test(p.identityDocument.label ?? '') ? 'studentPass' : 'ic';
    draft[kind].front = p.identityDocument;
  }
  return draft;
}

/** Error message, or null when the documents meet the rule. */
export function validateDraft(d: IdDraft): string | null {
  for (const doc of ID_DOCS) {
    const { front, back } = d[doc.key];
    if (front && !back) return `Please upload the back side of your ${doc.label}.`;
    if (back && !front) return `Please upload the front side of your ${doc.label}.`;
  }
  const complete = ID_DOCS.some((doc) => d[doc.key].front && d[doc.key].back);
  return complete ? null : 'Please upload at least one document — Student Pass or Identity Card (IC) — front and back.';
}

/** Uploads the newly picked files and returns what to save. Call validateDraft first. */
export async function uploadDraft(uid: string, d: IdDraft): Promise<IdentityDocuments> {
  const out: IdentityDocuments = {};
  for (const doc of ID_DOCS) {
    const sides = d[doc.key];
    if (!sides.front || !sides.back) continue;
    const save = async (side: DocSide, f: DraftFile): Promise<StoredFile> => {
      const label = `${doc.label} — ${SIDE_LABEL[side]}`;
      if (isPicked(f)) return { ...(await uploadUserFile(uid, 'identity', f)), label };
      return { ...f, label };
    };
    out[doc.key] = { front: await save('front', sides.front), back: await save('back', sides.back) };
  }
  return out;
}

/** First front side, kept in the old identityDocument field. */
export function primaryDocument(docs: IdentityDocuments): StoredFile | undefined {
  return docs.studentPass?.front ?? docs.ic?.front;
}

export const hasIdentityDocuments = (p: UserDoc) =>
  !!(p.identityDocuments?.studentPass || p.identityDocuments?.ic || p.identityDocument);
