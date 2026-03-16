"use client";

import type { CSSProperties, ReactNode, KeyboardEvent, RefObject } from "react";

type TrialRpgDialogProps = {
  typedText: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onAdvance: () => void;
  catSvg: string;
  isCatAwake: boolean;
  catEyeOffset: { x: number; y: number };
  catRef?: RefObject<HTMLDivElement | null>;
  actions?: ReactNode;
  ariaLabel?: string;
};

export default function TrialRpgDialog(props: TrialRpgDialogProps) {
  const {
    typedText,
    isMuted,
    onToggleMute,
    onClose,
    onAdvance,
    catSvg,
    isCatAwake,
    catEyeOffset,
    catRef,
    actions,
    ariaLabel = "Avanzar dialogo",
  } = props;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAdvance();
    }
  };

  return (
    <div className="trial-rpg-modal w-full max-w-lg">
      <div
        className="trial-rpg-shell"
        role="button"
        tabIndex={0}
        onClick={onAdvance}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
      >
        <div className="trial-rpg-controls" aria-label="Controles de dialogo">
          <button
            type="button"
            className="trial-rpg-iconbtn trial-rpg-close"
            aria-label="Cerrar dialogo"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
          <button
            type="button"
            className="trial-rpg-iconbtn trial-rpg-mute"
            aria-label={isMuted ? "Activar sonido" : "Silenciar sonido"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMute();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              {isMuted ? (
                <>
                  <path d="M16 9l5 6" />
                  <path d="M21 9l-5 6" />
                </>
              ) : (
                <path d="M16 9a5 5 0 0 1 0 6" />
              )}
            </svg>
          </button>
        </div>
        <div className="trial-rpg-body">
          <div className="trial-rpg-textpane">
            <div className="trial-rpg-copy">
              <p className="trial-rpg-line">
                {typedText}
                <span
                  className="trial-rpg-caret"
                  aria-hidden={typedText.length === 0}
                >
                  |
                </span>
              </p>
              {actions ? (
                <div className="trial-rpg-actions" aria-hidden={false}>
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
          <div className="trial-rpg-catpane" aria-hidden="true">
            <div
              className={`trial-rpg-cat kp-trial-cat mouse-detector${
                isCatAwake ? " is-awake" : ""
              }`}
              ref={catRef}
              style={
                {
                  "--cat-eye-x": `${catEyeOffset.x}px`,
                  "--cat-eye-y": `${catEyeOffset.y}px`,
                } as CSSProperties
              }
            >
              <div className="cat">
                <div className="sleep-symbol" aria-hidden="true">
                  <span className="z z1">Z</span>
                  <span className="z z2">z</span>
                  <span className="z z3">Z</span>
                </div>
                <div
                  className="thecat"
                  dangerouslySetInnerHTML={{ __html: catSvg }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
