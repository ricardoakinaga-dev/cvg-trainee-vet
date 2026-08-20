"use client";

import type { ParticipantLoginViewProps } from "./participant-login-types";
import { ParticipantLoginFormPanel } from "./participant-login-form";
import { ParticipantLoginVisual } from "./participant-login-visual";

export type { ParticipantLoginViewProps } from "./participant-login-types";

export function ParticipantLoginView(
  props: ParticipantLoginViewProps,
): React.JSX.Element {
  return (
    <section className="login-card" aria-labelledby="access-title">
      <ParticipantLoginVisual />
      <ParticipantLoginFormPanel {...props} />
    </section>
  );
}
