"use client";

import { LoginMascot } from "./login-mascot";

export function ParticipantLoginVisual(): React.JSX.Element {
  return (
    <div className="login-visual">
      <div className="login-kicker">
        <span className="login-kicker-icon" aria-hidden="true">
          ✦
        </span>
        Jornada de desenvolvimento clínico
      </div>
      <h1 id="access-title">Entrar no treinamento</h1>
      <p className="login-lede">Sua missão começa aqui</p>
      <p className="login-description">
        Avance por desafios, perguntas e decisões que transformam estudo em
        prática segura — um passo de cada vez.
      </p>

      <div className="login-mascot-stage">
        <div className="mascot-orbit mascot-orbit-one" />
        <div className="mascot-orbit mascot-orbit-two" />
        <LoginMascot />
        <div className="mascot-message">
          <span className="mascot-message-tail" aria-hidden="true" />
          <strong>Oi, eu sou o Caju.</strong>
          <span>Vou te acompanhar nessa jornada.</span>
        </div>
      </div>

      <div className="login-trail-preview" aria-label="Prévia da trilha">
        <TrailStep
          number="01"
          title="Fundamentos"
          subtitle="Comece por aqui"
          active
        />
        <div className="trail-connector" aria-hidden="true" />
        <TrailStep
          number="02"
          title="Raciocínio clínico"
          subtitle="Desafios práticos"
        />
        <div className="trail-connector" aria-hidden="true" />
        <TrailStep
          number="03"
          title="Consolidação"
          subtitle="Seu próximo nível"
        />
      </div>
    </div>
  );
}

function TrailStep({
  number,
  title,
  subtitle,
  active = false,
}: Readonly<{
  number: string;
  title: string;
  subtitle: string;
  active?: boolean;
}>): React.JSX.Element {
  return (
    <div className={"trail-step" + (active ? " is-active" : "")}>
      <span className="trail-step-number">{number}</span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}
