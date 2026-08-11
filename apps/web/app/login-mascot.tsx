export function LoginMascot() {
  return (
    <svg
      className="login-mascot"
      viewBox="0 0 240 220"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mascot-fur" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff8ec" />
          <stop offset="100%" stopColor="#f2d4af" />
        </linearGradient>
        <linearGradient id="mascot-ear" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5f56" />
          <stop offset="100%" stopColor="#563d42" />
        </linearGradient>
      </defs>
      <circle className="mascot-aura" cx="120" cy="110" r="98" />
      <path
        className="mascot-ear"
        d="M69 67C37 45 25 68 35 106c8 30 27 42 46 25l6-46-18-18Z"
        fill="url(#mascot-ear)"
      />
      <path
        className="mascot-ear"
        d="M171 67c32-22 44 1 34 39-8 30-27 42-46 25l-6-46 18-18Z"
        fill="url(#mascot-ear)"
      />
      <path
        className="mascot-face"
        d="M120 30c-45 0-73 35-73 84 0 55 31 82 73 82s73-27 73-82c0-49-28-84-73-84Z"
        fill="url(#mascot-fur)"
      />
      <path
        className="mascot-spot"
        d="M153 44c21 13 31 39 31 70 0 34-13 59-35 71 8-20 12-42 12-69 0-29-3-52-8-72Z"
      />
      <ellipse className="mascot-muzzle" cx="120" cy="133" rx="45" ry="33" />
      <circle className="mascot-eye" cx="91" cy="111" r="8" />
      <circle className="mascot-eye" cx="149" cy="111" r="8" />
      <circle className="mascot-eye-glint" cx="94" cy="108" r="2.5" />
      <circle className="mascot-eye-glint" cx="152" cy="108" r="2.5" />
      <path
        className="mascot-nose"
        d="M108 128c0-7 24-7 24 0 0 9-5 13-12 13s-12-4-12-13Z"
      />
      <path
        className="mascot-smile"
        d="M120 140c0 11-9 14-17 10m17-10c0 11 9 14 17 10"
      />
      <path
        className="mascot-collar"
        d="M65 165c16 16 36 24 55 24s39-8 55-24l-7 25c-14 11-30 16-48 16s-34-5-48-16l-7-25Z"
      />
      <circle className="mascot-tag" cx="120" cy="196" r="9" />
      <path className="mascot-tag-mark" d="M116 196h8m-4-4v8" />
    </svg>
  );
}
