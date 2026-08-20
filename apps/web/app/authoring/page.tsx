"use client";

import { useEffect } from "react";
import { createAuthoringActions } from "../authoring-actions";
import { AuthoringView } from "../authoring-view";
import { useAuthoringPageState } from "../authoring-state";

function queryInput(): Readonly<{
  readonly contentId: string;
  readonly version: string;
  readonly scopeId: string;
}> {
  if (typeof window === "undefined") {
    return { contentId: "", version: "1", scopeId: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    contentId: params.get("contentId") ?? "",
    version: params.get("version") ?? "1",
    scopeId: params.get("scopeId") ?? "",
  };
}

export default function AuthoringPage() {
  const state = useAuthoringPageState();
  const actions = createAuthoringActions(state);

  useEffect(() => {
    const input = queryInput();
    state.setContentId(input.contentId);
    state.setVersion(input.version);
    state.setScopeId(input.scopeId);
    if (input.contentId.trim().length > 0) {
      void actions.loadRecord(input.contentId, input.version);
    } else if (input.scopeId.trim().length > 0) {
      void actions.loadQueue(input.scopeId, 1);
    }
  }, []);

  return <AuthoringView {...state} {...actions} />;
}
