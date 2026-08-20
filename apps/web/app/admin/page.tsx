"use client";

import { useEffect } from "react";
import { createAdminActions } from "./admin-actions";
import { AdminView } from "./admin-view";
import { useAdminPageState } from "./admin-state";

function invitationPath(token: string | undefined): string | null {
  return token === undefined
    ? null
    : "/invite#token=" + encodeURIComponent(token);
}

export default function AdminPage() {
  const state = useAdminPageState();
  const actions = createAdminActions(state);

  useEffect(() => {
    void actions.load();
  }, []);

  return (
    <AdminView
      {...state}
      {...actions}
      invitationPath={invitationPath(state.invitation?.token)}
    />
  );
}
