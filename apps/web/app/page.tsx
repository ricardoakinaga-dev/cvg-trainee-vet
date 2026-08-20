"use client";

import { useEffect } from "react";
import { createParticipantActions } from "./participant-actions";
import { deriveParticipantState } from "./participant-derived";
import { ParticipantExperienceView } from "./participant-experience-view";
import { initialActivityId } from "./participant-model";
import { useParticipantPageState } from "./participant-state";

export default function HomePage() {
  const state = useParticipantPageState();
  const actions = createParticipantActions(state);

  useEffect(() => {
    state.setActivityId(initialActivityId());
    void actions.restoreSession();
  }, []);

  const derived = deriveParticipantState(
    state.activity,
    state.attempt,
    state.answers,
    state.questionPage,
    state.pageSaveState,
  );

  return (
    <ParticipantExperienceView {...state} {...derived} actions={actions} />
  );
}
