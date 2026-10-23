'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Info, X } from 'lucide-react';
import { Button, Modal, Spinner } from './ui';
import { fileUrl, setDocumentStatus, type UserDocument } from '@/lib/users';
import { fileSize } from '@/lib/format';
import type { UserDoc } from '@/lib/types';

/** Shows a user's document; in review mode the admin can approve or reject it. */
export default function DocumentReviewModal({
  user,
  document,
  mode,
  onClose,
}: {
  user: UserDoc;
  document: UserDocument | null;
  mode: 'view' | 'review';
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'verified' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setLoadError(null);
    setError(null);
    if (!document) return;
    let cancelled = false;
    setLoading(true);
    fileUrl(document.file)
      .then((u) => !cancelled && setUrl(u))
      .catch((e) => !cancelled && setLoadError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [document]);

  if (!document) return null;
  const { file } = document;
  const isPdf = file.contentType === 'application/pdf';
  const isImage = file.contentType.startsWith('image/');
  const isVideo = file.contentType.startsWith('video/');

  const decide = async (status: 'verified' | 'rejected') => {
    setBusy(status);
    setError(null);
    try {
      await setDocumentStatus(user, document.ref, status);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open onClose={onClose} className="max-w-[959px] overflow-hidden">
      <div className="flex items-start justify-between border-b border-field px-6 py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-[#1e293b]">{document.label}</h2>
          <p className="truncate text-sm text-[#64748b]">
            {file.name}
            {file.size ? ` · ${fileSize(file.size)}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-muted hover:bg-page">
          <X className="size-5" />
        </button>
      </div>

      {mode === 'review' ? (
        <div className="flex items-center gap-3 bg-brand/20 px-6 py-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
            <Info className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-[#1e293b]">Please review the document below</p>
            <p className="text-xs text-[#64748b]">Approve it if it is clear and matches the user’s details.</p>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-[420px] place-items-center bg-[#f8fafc] p-6">
        {loading ? (
          <Spinner />
        ) : url ? (
          isPdf ? (
            <iframe src={url} title={file.name} className="h-[65vh] w-full rounded-[10px] border border-field bg-white" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="max-h-[65vh] max-w-full rounded-[10px] border border-field bg-white object-contain" />
          ) : isVideo ? (
            <video src={url} controls className="max-h-[65vh] max-w-full rounded-[10px]" />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-brand underline">
              Open file <ExternalLink className="size-4" />
            </a>
          )
        ) : (
          <div className="max-w-md text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-card bg-brand/10 text-brand">
              <FileText className="size-7" />
            </span>
            <p className="mt-4 font-semibold text-ink">{loadError ? 'Couldn’t load this file' : 'File not available'}</p>
            <p className="mt-1.5 text-sm text-muted">
              {loadError
                ? loadError
                : 'This file was uploaded before file saving was switched on, so only its name was recorded. Ask the user to upload it again from the app (Account → Identity Documents or Payment Details).'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-field bg-page px-6 py-[14px]">
        {error ? <p className="mr-auto text-sm text-danger">{error}</p> : null}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            Open in new tab <ExternalLink className="size-4" />
          </a>
        ) : null}
        {mode === 'review' ? (
          <>
            <Button variant="danger" size="lg" className="w-[166px]" loading={busy === 'rejected'} disabled={!!busy} onClick={() => decide('rejected')}>
              Reject
            </Button>
            <Button variant="success" size="lg" className="w-[166px]" loading={busy === 'verified'} disabled={!!busy} onClick={() => decide('verified')}>
              Approve
            </Button>
          </>
        ) : (
          <Button variant="outline" size="lg" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </Modal>
  );
}
