"use client";

import React, { ReactNode } from "react";
import { config } from "@fortawesome/fontawesome-svg-core";
import { AuthProvider } from "../contexts/AuthContext";
import { BreadcrumbProvider } from "../contexts/BreadcrumbContext";
import { AuthGuard } from "../components/AuthGuard";

// Font Awesome の autoAddCss を無効化
config.autoAddCss = false;

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <AuthGuard>{children}</AuthGuard>
      </BreadcrumbProvider>
    </AuthProvider>
  );
}
