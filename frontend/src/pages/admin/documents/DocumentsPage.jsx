import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentMarkup from './DocumentMarkup';
import { initGenerator } from './documentsController';
import { useSession } from '../../../session/SessionProvider';
import usePageTitle from '../../../usePageTitle';
import '../../../styles/documents.css';

/*
 * This route deliberately does NOT use <PortalShell>. The generator brings its
 * own app bar (with the autosave stamp and Clear draft), and the @media print
 * rules in documents.css hide that bar by name — dropping the shared portal
 * chrome in here would print it.
 */
export default function DocumentsPage() {
  usePageTitle('BIMDEC — Document System');

  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useSession();

  useEffect(() => {
    // initGenerator restores the saved draft, renders the previews, and wires
    // every listener; the value it returns saves the draft and unwinds them.
    return initGenerator(rootRef.current, {
      who: user.fullName,
      onLogout: () => navigate('/login', { replace: true }),
    });
    // Runs once for the life of the mount — see the invariant in DocumentMarkup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DocumentMarkup rootRef={rootRef} />;
}
