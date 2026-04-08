export type TrialRpgDialogMode = "login" | "demo" | "inicio";

export type TrialRpgDialogProfile = {
  speakerLabel: string;
  ariaLabel: string;
};

export const TRIAL_RPG_DIALOG_PROFILES: Record<
  TrialRpgDialogMode,
  TrialRpgDialogProfile
> = {
  login: {
    speakerLabel: "KITTYPAU",
    ariaLabel: "Avanzar dialogo",
  },
  demo: {
    speakerLabel: "KITTYPAU",
    ariaLabel: "Avanzar dialogo",
  },
  inicio: {
    speakerLabel: "KITTYPAU",
    ariaLabel: "Avanzar guia",
  },
} as const;
