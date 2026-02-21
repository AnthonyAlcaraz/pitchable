import { useEffect } from 'react';
import { getSocket } from '../lib/socket.js';
import { useKbStore } from '../stores/kb.store.js';
import type { DocumentProgressEvent } from '../lib/socket.js';

export function useDocumentProgress(): void {
  const setDocumentProgress = useKbStore((s) => s.setDocumentProgress);
  const clearDocumentProgress = useKbStore((s) => s.clearDocumentProgress);
  const fetchDocuments = useKbStore((s) => s.fetchDocuments);

  useEffect(() => {
    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      // No auth token yet — skip socket setup
      return;
    }

    const handleProgress = (event: DocumentProgressEvent) => {
      setDocumentProgress(event.documentId, event.progress, event.step, event.message);

      // On terminal states, refresh documents and clear progress after delay
      if (event.progress === 100 || event.progress === -1) {
        void fetchDocuments();
        setTimeout(() => {
          clearDocumentProgress(event.documentId);
        }, 2000);
      }
    };

    socket.on('document:progress', handleProgress);

    return () => {
      socket.off('document:progress', handleProgress);
    };
  }, [setDocumentProgress, clearDocumentProgress, fetchDocuments]);
}
