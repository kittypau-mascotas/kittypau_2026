"use client";

import type { ReactNode } from "react";
import { ParallaxProvider } from "react-scroll-parallax";
import { isNativeFlavorEnabled } from "@/lib/runtime/app-flavor";

export default function ParallaxRoot({ children }: { children: ReactNode }) {
  return (
    <ParallaxProvider isDisabled={!isNativeFlavorEnabled()}>
      {children}
    </ParallaxProvider>
  );
}
