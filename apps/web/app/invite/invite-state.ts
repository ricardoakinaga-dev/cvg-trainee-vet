import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  acceptInvitation,
  readInvitationToken,
  stripInvitationTokenFromUrl,
  validateInvitationForm,
} from "./invite-model";

export type InviteActivationState = Readonly<{
  token: string | null;
  password: string;
  confirmation: string;
  busy: boolean;
  complete: boolean;
  error: string | null;
  setPassword: (value: string) => void;
  setConfirmation: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}>;

const unavailableMessage =
  "Não foi possível ativar este acesso. Solicite um novo link ao superadmin.";

export function useInviteActivation(apiBase: string): InviteActivationState {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextToken = readInvitationToken(
      new URLSearchParams(window.location.search),
    );
    setToken(nextToken);
    if (nextToken !== null) {
      window.history.replaceState(
        window.history.state,
        "",
        stripInvitationTokenFromUrl(window.location.href),
      );
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const validationError = validateInvitationForm({
        token,
        password,
        confirmation,
      });
      if (validationError !== null) {
        setError(validationError);
        return;
      }

      setBusy(true);
      setError(null);
      try {
        await acceptInvitation(apiBase, token as string, password);
        setPassword("");
        setConfirmation("");
        setToken(null);
        setComplete(true);
      } catch {
        setError(unavailableMessage);
      } finally {
        setBusy(false);
      }
    },
    [apiBase, confirmation, password, token],
  );

  return {
    token,
    password,
    confirmation,
    busy,
    complete,
    error,
    setPassword,
    setConfirmation,
    handleSubmit,
  };
}
