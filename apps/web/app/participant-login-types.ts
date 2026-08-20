import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { RetryAction } from "./participant-model";

export type ParticipantLoginViewProps = Readonly<{
  readonly login: string;
  readonly password: string;
  readonly showPassword: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly retryAction: RetryAction;
  readonly setLogin: Dispatch<SetStateAction<string>>;
  readonly setPassword: Dispatch<SetStateAction<string>>;
  readonly setShowPassword: Dispatch<SetStateAction<boolean>>;
  readonly handleLogin: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleRetry: () => void;
}>;
