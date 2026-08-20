"use client";

import { useInviteActivation } from "./invite-state";
import {
  InviteComplete,
  InviteFeedback,
  InviteForm,
  InviteHeader,
  InviteIntro,
} from "./invite-view";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export default function InvitePage() {
  const invite = useInviteActivation(apiBase);

  return (
    <main className="shell first-access-shell" id="main-content" tabIndex={-1}>
      <InviteHeader />
      <section className="first-access-card" aria-labelledby="invite-title">
        <InviteIntro />
        {invite.complete ? (
          <InviteComplete />
        ) : invite.token === null ? (
          <p className="first-access-invalid" role="alert">
            Consultando o link de primeiro acesso…
          </p>
        ) : (
          <InviteForm
            password={invite.password}
            confirmation={invite.confirmation}
            busy={invite.busy}
            onPasswordChange={invite.setPassword}
            onConfirmationChange={invite.setConfirmation}
            onSubmit={invite.handleSubmit}
          />
        )}
      </section>
      <InviteFeedback error={invite.error} />
    </main>
  );
}
