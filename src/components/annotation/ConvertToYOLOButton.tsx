import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as modelsApi from "@/lib/api/models";

interface ConvertToYOLOButtonProps {
  datasetId: string;
  imageIds?: string[];
  /** Defaults to detection export; use YOLO_SEG when annotations are polygon/segmentation. */
  modelType?: "YOLO" | "YOLO_SEG";
  onConversionComplete?: (result: {
    converted: number;
    labelFilesCreated: number;
    message: string;
  }) => void;
}

export const ConvertToYOLOButton: React.FC<ConvertToYOLOButtonProps> = ({
  datasetId,
  imageIds,
  modelType = "YOLO",
  onConversionComplete,
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    setShowConfirm(false);
    setIsConverting(true);

    try {
      const result = await modelsApi.convertAnnotationsToLabels(datasetId, {
        modelType,
        imageIds,
      });

      toast({
        title: "Conversion successful",
        description: `Converted ${result.converted} annotations to ${result.labelFilesCreated} label files.`,
      });

      onConversionComplete?.(result);
    } catch (error) {
      toast({
        title: "Conversion failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to convert annotations to YOLO format.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={isConverting}
        className="gap-2"
      >
        {isConverting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <FileCode className="h-4 w-4" />
            Convert to YOLO
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Annotations to YOLO Format</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert all annotations for this dataset to YOLO label format.
              {imageIds && imageIds.length > 0 && (
                <span className="block mt-2">
                  {imageIds.length} image{imageIds.length !== 1 ? "s" : ""} will be processed.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert} disabled={isConverting}>
              {isConverting ? "Converting..." : "Convert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
