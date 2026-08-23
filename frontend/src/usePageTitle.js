import { useEffect } from 'react';

/* Each page used to set its own <title>; a single-document SPA has to do it
   at runtime instead. */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
