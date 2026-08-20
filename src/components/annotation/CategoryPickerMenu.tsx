import React, { useEffect, useRef } from "react";
import type { Category } from "@/types/annotation";

interface CategoryPickerMenuProps {
  open: boolean;
  /** Pixel x relative to the image container */
  x: number;
  /** Pixel y relative to the image container */
  y: number;
  categories: Category[];
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

export const CategoryPickerMenu: React.FC<CategoryPickerMenuProps> = ({
  open,
  x,
  y,
  categories,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Transparent backdrop — clicking anywhere outside closes the menu */}
      <div
        className="absolute inset-0 z-40"
        aria-label="Close category picker"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* The actual menu */}
      <div
        ref={menuRef}
        className="absolute z-50 min-w-[180px] max-h-[260px] overflow-y-auto rounded-md border bg-popover shadow-lg py-1"
        style={{ left: x, top: y }}
        role="menu"
        aria-label="Select class"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground select-none">
          Select class
        </p>

        {categories.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No categories yet. Add one from the sidebar.
          </p>
        ) : (
          categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent outline-none"
              onClick={() => onSelect(category.id)}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </button>
          ))
        )}
      </div>
    </>
  );
};
