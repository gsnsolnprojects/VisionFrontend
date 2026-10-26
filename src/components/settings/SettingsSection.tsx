import React from "react";
import { Card, CardContent } from "@/components/ui/card";

/** Title, one plain sentence about what the section is for, and its content */
export const SettingsSection: React.FC<{ title: string; intro: string; children: React.ReactNode }> = ({
  title,
  intro,
  children,
}) => (
  <section aria-labelledby="settings-section-title" className="space-y-4">
    <div>
      <h2 id="settings-section-title" className="text-xl font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
    </div>
    {children}
  </section>
);

/** A white card holding one group of fields */
export const SettingsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Card className={className}>
    <CardContent className="space-y-4 pt-6">{children}</CardContent>
  </Card>
);
