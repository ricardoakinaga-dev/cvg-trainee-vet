"use client";

import { useEffect } from "react";
import { createAccountActions } from "../account-actions";
import { AccountView } from "../account-view";
import { useAccountPageState } from "../account-state";

export default function AccountPage() {
  const state = useAccountPageState();
  const actions = createAccountActions(state);

  useEffect(() => {
    void actions.load();
  }, []);

  return <AccountView {...state} {...actions} />;
}
