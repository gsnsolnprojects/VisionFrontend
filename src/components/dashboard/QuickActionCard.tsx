import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  isPrimary?: boolean;
}

/**
 * QuickActionCard Component
 * 
 * Interactive card for quick actions on the dashboard.
 * Supports hover effects and disabled state.
 */
export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  disabled = false,
  isPrimary = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={title}
      aria-describedby={`${title}-description`}
      aria-disabled={disabled}
      className={cn(
        "h-full cursor-pointer transition-all duration-300 ease-in-out group",
        "shadow-sm dark:shadow-black/30 shadow-md",
        "hover:shadow-md dark:hover:shadow-black/50",
        "hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 hover:bg-accent/10",
        "dark:hover:border-primary/40 dark:hover:bg-accent/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        isPrimary && "border-2 border-primary/30 bg-primary/5 dark:bg-primary/10",
        disabled && "opacity-60 cursor-not-allowed hover:shadow-sm hover:scale-100 hover:border-border"
      )}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-start space-y-4">
          <div 
            className={cn(
              "p-3 rounded-lg bg-primary/10 dark:bg-primary/20 transition-colors",
              "group-hover:bg-primary/20 dark:group-hover:bg-primary/30",
              "vision:bg-accent vision:group-hover:bg-accent",
              disabled && "bg-muted dark:bg-muted/50 vision:bg-muted vision:group-hover:bg-muted"
            )}
            aria-hidden="true"
          >
            <Icon
              className={cn(
                "h-6 w-6 text-primary dark:text-primary vision:text-accent-foreground",
                disabled && "text-muted-foreground vision:text-muted-foreground"
              )}
              strokeWidth={1.5}
            />
          </div>
          <div className="space-y-1.5 w-full">
            <h3 className="font-semibold text-sm leading-tight text-foreground after:content-['→'] after:ml-2 after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-200">
              {title}
            </h3>
            <p 
              id={`${title}-description`}
              className="text-xs text-muted-foreground/80 font-normal leading-tight"
            >
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

