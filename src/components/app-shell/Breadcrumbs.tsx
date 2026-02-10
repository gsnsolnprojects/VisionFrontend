import React from "react";
import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbs } from "./breadcrumb-context";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const AppBreadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className,
}) => {
  const location = useLocation();
  const { items: contextItems } = useBreadcrumbs();

  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbItems = contextItems || items || generateBreadcrumbsFromPath(location.pathname);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Always start with Dashboard
  if (paths.length > 0 && paths[0] !== "dashboard") {
    items.push({ label: "Dashboard", href: "/dashboard" });
  }

  // Build breadcrumbs from path segments
  let currentPath = "";
  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === paths.length - 1;

    // Skip dashboard as it's already added
    if (segment === "dashboard" && index === 0) {
      items.push({ label: "Dashboard", href: "/dashboard" });
      return;
    }

    // Format label (capitalize, replace hyphens) - segment from pathname is escaped on render
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return items;
}

