/*
 * Loads the signed-in user's profile once for the whole app instead of once
 * per page (which is what every *.html file used to do via DB.requireSession),
 * and keeps it in sync when Supabase signs in or out in another tab.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import DB from '../lib/db';
import { supabase } from '../lib/supabaseClient';

const SessionCtx = createContext({ loading: true, user: null, refresh: () => {} });

export function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const user = await DB.getSession();
      if (alive) setState({ loading: false, user });
    };

    load();

    const { data } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    const user = await DB.getSession();
    setState({ loading: false, user });
  };

  return (
    <SessionCtx.Provider value={{ ...state, refresh }}>{children}</SessionCtx.Provider>
  );
}

export function useSession() {
  return useContext(SessionCtx);
}
