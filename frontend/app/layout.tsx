import "./globals.css";
import type { ReactNode } from "react";

import { NavLink } from "../components/NavLink";

const nav = [
  ["Overview", "/"],
  ["Submit", "/submit"],
  ["Claims", "/claims"],
  ["Test Cases", "/test-cases"],
  ["Dashboard", "/dashboard"],
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 md:px-8 md:py-6">
          <header className="mb-6 rounded-[30px] border border-plum/10 bg-white/72 px-5 py-5 shadow-panel backdrop-blur md:mb-8 md:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-plum/10 bg-lavender/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-plum/80">
                  Claims operations
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.3em] text-ink/45">
                  InsureCheck AI
                </p>
                <h1 className="mt-1.5 font-display text-[1.8rem] leading-snug text-ink md:text-[2rem]">
                  OPD adjudication console
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
                  A claims workspace for intake review, policy validation, and
                  decision tracking.
                </p>
              </div>
              <nav className="flex flex-wrap gap-2 rounded-full border border-plum/10 bg-white/55 p-2">
                {nav.map(([label, href]) => (
                  <NavLink key={href} href={href} label={label} />
                ))}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
