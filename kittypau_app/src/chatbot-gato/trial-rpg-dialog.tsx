"use client";

import {
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  TRIAL_RPG_DIALOG_PROFILES,
  type TrialRpgDialogMode,
} from "@/chatbot-gato/dialog-profile";

type TrialRpgDialogProps = {
  dialogMode: TrialRpgDialogMode;
  typedText: string;
  isTyping?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onAdvance: () => void;
  catSvg: string;
  isCatAwake: boolean;
  catEyeOffset: { x: number; y: number };
  catRef?: RefObject<HTMLDivElement | null>;
  actions?: ReactNode;
};

export default function TrialRpgDialog(props: TrialRpgDialogProps) {
  const {
    dialogMode,
    typedText,
    isTyping = false,
    isMuted,
    onToggleMute,
    onClose,
    onAdvance,
    catSvg,
    isCatAwake,
    catEyeOffset,
    catRef,
    actions,
  } = props;
  const profile = TRIAL_RPG_DIALOG_PROFILES[dialogMode];
  const textPaneRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLDivElement | null>(null);
  const hasOverflow = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const textPane = textPaneRef.current;
      const message = messageRef.current;
      if (!textPane || !message) return () => undefined;

      let rafId = 0;
      const handleChange = () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(onStoreChange);
      };

      const observer = new ResizeObserver(handleChange);
      observer.observe(textPane);
      observer.observe(message);
      window.addEventListener("resize", handleChange);

      return () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        observer.disconnect();
        window.removeEventListener("resize", handleChange);
      };
    },
    () => {
      const textPane = textPaneRef.current;
      const message = messageRef.current;
      if (!textPane || !message) return false;
      const availableHeight = textPane.clientHeight;
      const contentHeight = message.scrollHeight;
      return contentHeight > availableHeight + 2;
    },
    () => false,
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAdvance();
    }
  };
  const showContinueButton = !isTyping && hasOverflow;

  return (
    <div className="trial-rpg-modal w-full max-w-lg">
      <div
        className="trial-rpg-shell"
        role="button"
        tabIndex={0}
        onClick={onAdvance}
        onKeyDown={onKeyDown}
        aria-label={profile.ariaLabel}
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
          <div className="trial-rpg-textpane" ref={textPaneRef}>
            <div className="trial-rpg-copy">
              <div className="trial-rpg-message" ref={messageRef}>
                <div className="trial-rpg-header" aria-hidden="true">
                  <span className="trial-rpg-speaker">
                    {profile.speakerLabel}
                  </span>
                  <span className="trial-rpg-header-line" />
                </div>
                <p className="trial-rpg-line">
                  {typedText}
                  <span
                    className="trial-rpg-caret"
                    aria-hidden={typedText.length === 0}
                  >
                    |
                  </span>
                </p>
              </div>
              {showContinueButton ? (
                <div className="trial-rpg-continue-row">
                  <span className="trial-rpg-ellipsis">...</span>
                  <button
                    type="button"
                    className="trial-rpg-continue"
                    aria-label="Continuar dialogo"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAdvance();
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5l10 7-10 7V5z" />
                    </svg>
                  </button>
                </div>
              ) : null}
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
