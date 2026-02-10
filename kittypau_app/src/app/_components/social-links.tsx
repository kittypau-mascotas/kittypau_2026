type SocialLinksProps = {
  className?: string;
  size?: "sm" | "md";
};

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/kittypau-mascotas/",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M6.94 8.5V20H3.5V8.5h3.44ZM5.22 7.06a1.99 1.99 0 1 1 0-3.98 1.99 1.99 0 0 1 0 3.98ZM20.5 13.06V20h-3.44v-6.04c0-1.52-.54-2.56-1.9-2.56-1.04 0-1.66.7-1.93 1.38-.1.25-.12.6-.12.95V20H9.68V8.5h3.44v1.58c.46-.7 1.28-1.7 3.1-1.7 2.26 0 3.98 1.48 3.98 4.68Z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCYrN8v3Lb5n1B0L2QeOEcxA",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.12-2.12C17.9 4.6 12 4.6 12 4.6s-5.9 0-7.48.48A3 3 0 0 0 2.4 7.2 31.6 31.6 0 0 0 2 12c0 1.6.1 3.2.4 4.8a3 3 0 0 0 2.12 2.12c1.58.48 7.48.48 7.48.48s5.9 0 7.48-.48a3 3 0 0 0 2.12-2.12c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8ZM10 15.5V8.5l6 3.5-6 3.5Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/kittypau.mascotas/",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M7.5 3.5h9A4 4 0 0 1 20.5 7.5v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Zm0 2A2 2 0 0 0 5.5 7.5v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-9Zm4.5 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
      </svg>
    ),
  },
];

export default function SocialLinks({ className, size = "md" }: SocialLinksProps) {
  const sizeClass = size === "sm" ? "social-link-sm" : "social-link-md";
  return (
    <div className={`social-links ${className ?? ""}`.trim()}>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className={`social-link ${sizeClass}`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
