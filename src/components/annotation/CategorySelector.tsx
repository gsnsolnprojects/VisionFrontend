import React from "react";
import type { Category } from "@/types/annotation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategorySelect?: (categoryId: string) => void;
  onAddCategory?: () => void;
  /** Nothing can be picked or added (e.g. a photo marked good) */
  disabled?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onAddCategory,
  disabled = false,
}) => {
  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-3">
      {hasCategories ? (
        <Select
          value={selectedCategoryId ?? undefined}
          onValueChange={(value) => onCategorySelect?.(value)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/50">
          No categories yet. Click "Add Category" to create one.
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddCategory}
        disabled={disabled}
        className="w-full"
      >
        Add Category
      </Button>
    </div>
  );
};

