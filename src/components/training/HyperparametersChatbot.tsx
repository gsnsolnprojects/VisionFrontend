import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, X, Send, Bot, Check, Square } from "lucide-react";
import { useAIChat, type AIProvider } from "@/hooks/useAIChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { HyperparametersSnapshot } from "@/utils/trainingPersistence";
import type { TrainModelType } from "@/types/training";
import { ProviderSelector } from "@/components/ai/ProviderSelector";

interface HyperparametersChatbotProps {
  datasetInfo: {
    datasetId: string;
    totalImages?: number;
    labeledImages?: number;
    unlabeledImages?: number;
    trainCount?: number;
    valCount?: number;
    testCount?: number;
    numClasses?: number;
    version?: string;
    status?: string;
  };
  modelType: TrainModelType;
  currentParams?: {
    epochs?: number;
    batchSize?: number;
    imgSize?: number;
    learningRate?: number;
    workers?: number;
  };
  /**
   * Called when the user applies AI-suggested parameters.
   * If a specific YOLO model variant was chosen from AI suggestions,
   * modelKey will contain that variant key (e.g. "YOLOv8s").
   */
  onParamsSuggested?: (params: HyperparametersSnapshot, modelKey?: string) => void;
}

const SYSTEM_PROMPT = `
You are a senior machine learning engineer specializing in YOLO object detection models.

Your task is to recommend PRACTICAL, SAFE, and PRODUCTION-READY hyperparameters.
The goal is NOT to squeeze maximum accuracy, but to ensure:
- Stable training
- Reasonable convergence
- Minimal overfitting
- Correct defaults for non-technical users

ASSUME:
- Pretrained YOLO weights are ALWAYS used (transfer learning).
- Training NEVER starts from scratch.

────────────────────────────────
STEP 1: DATASET SIZE CLASSIFICATION (MANDATORY)
────────────────────────────────
Classify the dataset based on the number of TRAINING images:

- EXTREMELY SMALL: train < 50
- SMALL: 50 ≤ train ≤ 200
- MEDIUM: 200 < train ≤ 5000
- LARGE: train > 5000

You MUST explicitly state the chosen bucket.

────────────────────────────────
STEP 2: YOLO MODEL CAPACITY (CRITICAL)
────────────────────────────────
YOLO models differ greatly in capacity. You MUST adapt parameters accordingly.

Model categories:
- NANO: YOLOv5 Nano, YOLOv8 Nano, YOLOv26 Nano
- SMALL: YOLOv8 Small, YOLOv11 Small
- MEDIUM: YOLOv8 Medium
- LARGE: YOLOv8 Large
- EXTRA LARGE: YOLOv8 Extra Large
These categories represent model capacity only. You MUST NOT recommend which specific YOLO variant to use.
Instead, you MUST provide parameter suggestions for each variant and explain the trade-offs.

RULE:
As model size increases:
- Reduce epochs (slightly)
- Reduce learning rate (slightly)
- Reduce batch size
- Increase overfitting warnings

────────────────────────────────
STEP 3: HARD PARAMETER LIMITS (DO NOT BREAK)
────────────────────────────────

EXTREMELY SMALL DATASET (<50 train):
- NANO: epochs 30–50, LR ≤ 0.003
- SMALL: epochs 25–40, LR ≤ 0.002
- MEDIUM+: epochs ≤ 25, LR = 0.001 ONLY
⚠ Strong overfitting warning required

SMALL DATASET (50–200 train):
- NANO: epochs 60–120, LR 0.002–0.005
- SMALL: epochs 50–100, LR 0.001–0.003
- MEDIUM+: epochs 40–80, LR ≤ 0.002

MEDIUM DATASET (200–5000 train):
- NANO: epochs 120–200, LR 0.005–0.01
- SMALL: epochs 100–160, LR 0.003–0.008
- MEDIUM: epochs 80–140, LR 0.003–0.006
- LARGE/XL: epochs 60–120, LR 0.001–0.003

LARGE DATASET (>5000 train):
- Epochs: 120–300 (model dependent)
- LR: 0.005–0.01
- Batch size as allowed by GPU

GLOBAL CONSTRAINTS:
- Never suggest batch size > training images
- Never suggest LR < 0.0005 or > 0.02
- Never exceed dataset bucket ranges by more than ±20%

────────────────────────────────
STEP 4: EVALUATION REQUIREMENTS
────────────────────────────────
You MUST:
1. State dataset size bucket
2. State YOLO model capacity category (Nano / Small / Medium / Large / Extra Large) when applicable
3. Evaluate EACH current parameter as:
   - Too low
   - Reasonable
   - Too high / unsafe
4. Propose ONE coherent "default" configuration (for a typical YOLO model on this dataset)
5. Additionally, for YOLO models, provide parameter suggestions for EACH variant (YOLOv8n, YOLOv8s, YOLOv8m, YOLOv8l, YOLOv8x) in a separate JSON field called "perModel". Do NOT tell the user which model to choose; only describe how parameters and trade-offs differ.
6. Explain changes in SIMPLE language for non-technical users
7. Warn clearly about overfitting or instability
8. If labeling more data would help more than tuning, say so

────────────────────────────────
FINAL OUTPUT (MANDATORY)
────────────────────────────────
End with ONE valid JSON object. The top-level values are your default recommended configuration (model-agnostic or typical), and "perModel" holds per-variant suggestions when YOLO is used:

{
  "epochs": number,
  "batchSize": number,
  "imgSize": number,
  "learningRate": number,
  "workers": number,
  "reasoning": {
    "epochs": "short explanation",
    "batchSize": "short explanation",
    "imgSize": "short explanation",
    "learningRate": "short explanation",
    "workers": "short explanation"
  },
  "perModel": {
    "YOLOv8n": {
      "epochs": number,
      "batchSize": number,
      "imgSize": number,
      "learningRate": number,
      "workers": number
    },
    "YOLOv8s": {
      "epochs": number,
      "batchSize": number,
      "imgSize": number,
      "learningRate": number,
      "workers": number
    },
    "YOLOv8m": {
      "epochs": number,
      "batchSize": number,
      "imgSize": number,
      "learningRate": number,
      "workers": number
    },
    "YOLOv8l": {
      "epochs": number,
      "batchSize": number,
      "imgSize": number,
      "learningRate": number,
      "workers": number
    },
    "YOLOv8x": {
      "epochs": number,
      "batchSize": number,
      "imgSize": number,
      "learningRate": number,
      "workers": number
    }
  }
}
`;

export const HyperparametersChatbot: React.FC<HyperparametersChatbotProps> = ({
  datasetInfo,
  modelType,
  currentParams,
  onParamsSuggested
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [suggestedParams, setSuggestedParams] = useState<HyperparametersSnapshot | null>(null);
  const [perModelParams, setPerModelParams] = useState<Record<string, HyperparametersSnapshot> | null>(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState<string>("default");
  const [provider, setProvider] = useState<AIProvider>(() => {
    const stored = window.localStorage.getItem("aiProvider");
    return stored === "gemini" ? "gemini" : "gemini";
  });

  const buildDatasetContext = () => {
    // Calculate number of classes - use provided value or estimate from train/val/test splits
    const numClasses = datasetInfo.numClasses || 3; // Default to 3 if not provided
    
    // Calculate total labeled images from train/val/test splits if available
    const trainCount = datasetInfo.trainCount || 0;
    const valCount = datasetInfo.valCount || 0;
    const testCount = datasetInfo.testCount || 0;
    const totalLabeledFromSplits = trainCount + valCount + testCount;
    const totalLabeled = datasetInfo.labeledImages || totalLabeledFromSplits || 0;
    
    return {
      datasetId: datasetInfo.datasetId,
      datasetSize: datasetInfo.totalImages || 0,
      numClasses: numClasses,
      labeledImages: totalLabeled,
      unlabeledImages: datasetInfo.unlabeledImages || 0,
      trainCount: trainCount,
      valCount: valCount,
      testCount: testCount,
      trainValTestSplit: trainCount > 0 || valCount > 0 || testCount > 0 
        ? `${trainCount}/${valCount}/${testCount}` 
        : undefined,
      version: datasetInfo.version || "Unknown",
      status: datasetInfo.status || "Unknown",
    };
  };

  const {
    messages,
    isLoading,
    isAvailable,
    sendMessage,
    clearMessages,
    stop,
    lastProvider,
    isGeminiAvailable,
  } = useAIChat({
    provider,
    source: "training_config",
    contextBuilder: buildDatasetContext,
    systemPrompt: SYSTEM_PROMPT,
  });

  useEffect(() => {
    window.localStorage.setItem("aiProvider", provider);
  }, [provider]);

  // Clear messages and reset suggestions when dataset changes
  useEffect(() => {
    clearMessages();
    setSuggestedParams(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetInfo.datasetId]);

  const buildDatasetPrompt = () => {
    const trainCount = datasetInfo.trainCount || 0;
    const valCount = datasetInfo.valCount || 0;
    const testCount = datasetInfo.testCount || 0;
    const numClasses = datasetInfo.numClasses || 3;
    const totalLabeled = datasetInfo.labeledImages || (trainCount + valCount + testCount) || 0;

    const datasetSummary = {
      totalImages: datasetInfo.totalImages || 0,
      labeledImages: totalLabeled,
      unlabeledImages: datasetInfo.unlabeledImages || 0,
      trainCount: trainCount,
      valCount: valCount,
      testCount: testCount,
      numClasses: numClasses,
      version: datasetInfo.version || "Unknown",
      status: datasetInfo.status || "Unknown",
      modelType: modelType,
      currentParams: {
        epochs: currentParams?.epochs || 100,
        batchSize: currentParams?.batchSize || 16,
        imgSize: currentParams?.imgSize || 640,
        learningRate: currentParams?.learningRate || 0.01,
        workers: currentParams?.workers || 4,
      },
    };

    const trainingImages = trainCount || totalLabeled || datasetSummary.totalImages;

    return `You are a senior ML engineer helping configure ${
      modelType === "YOLO_SEG"
        ? "YOLO instance segmentation (YOLO_SEG)"
        : modelType === "RF_DETR"
          ? "RF-DETR object detection"
          : "YOLO object detection"
    } training.

Goal: suggest SAFE, PRACTICAL hyperparameters that avoid overfitting and are easy for non-technical users.

Dataset:
- Total images: ${datasetSummary.totalImages}
- Labeled: ${datasetSummary.labeledImages}, Unlabeled: ${datasetSummary.unlabeledImages}
- Train / Val / Test: ${trainCount}/${valCount}/${testCount}
- Classes: ${numClasses}
- Version / status: ${datasetSummary.version} / ${datasetSummary.status}

Model:
- Type: ${datasetSummary.modelType}

Current hyperparameters:
- Epochs: ${datasetSummary.currentParams.epochs}
- Batch size: ${datasetSummary.currentParams.batchSize}
- Image size: ${datasetSummary.currentParams.imgSize}
- Learning rate: ${datasetSummary.currentParams.learningRate}
- Workers: ${datasetSummary.currentParams.workers}

Let TRAIN_IMAGES = ${trainingImages}.
Dataset size buckets:
- EXTREMELY SMALL: TRAIN_IMAGES < 50
- SMALL: 50–200
- MEDIUM: 200–5000
- LARGE: > 5000

Use these as safe defaults (you may make small changes, but explain why):
- EXTREMELY SMALL: epochs 30–80, batch 2–4, img 416–512, lr 0.001–0.003
- SMALL: epochs 60–120, batch 4–8, img 512–640, lr 0.001–0.005
- MEDIUM: epochs 80–200, batch 8–32, img 640, lr 0.003–0.01
- LARGE: epochs 120–300, batch 16–64, img 640+, lr 0.005–0.01

Hard rules:
- Batch size must NOT be greater than TRAIN_IMAGES.
- Learning rate must stay between 0.0005 and 0.02.
- Stay close to the ranges above.
- If the dataset is EXTREMELY SMALL or SMALL, clearly warn about overfitting.

TASK:
1) Say which size bucket this dataset belongs to.
2) For each current parameter (epochs, batch size, image size, learning rate, workers), say if it is too low, reasonable, or too high/unsafe, with a short reason.
3) Propose ONE default set of hyperparameters for this dataset that is stable and follows the rules.
4) If the model type is YOLO, also give a separate set of hyperparameters for each YOLO variant we support (YOLOv26s, YOLOv11s, YOLOv5n, YOLOv8s, YOLOv8m, YOLOv8l, YOLOv8x). For each variant, adjust epochs, batch size, image size (if needed), and learning rate based on model capacity. Do NOT tell the user which model to pick; just show how the settings differ.
5) Use simple language.
6) If collecting more labeled data would help more than tuning, say that clearly.

OUTPUT:
First, write the explanations.
Then END with ONE JSON object:

{
  "epochs": number,
  "batchSize": number,
  "imgSize": number,
  "learningRate": number,
  "workers": number,
  "reasoning": {
    "epochs": "short explanation",
    "batchSize": "short explanation",
    "imgSize": "short explanation",
    "learningRate": "short explanation",
    "workers": "short explanation"
  },
  "perModel": {
    "YOLOv26s": { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv11s": { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv5n":  { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv8s":  { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv8m":  { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv8l":  { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number },
    "YOLOv8x":  { "epochs": number, "batchSize": number, "imgSize": number, "learningRate": number, "workers": number }
  }
}
`;
  };

  const handleAnalyze = async () => {
    if (!isAvailable) {
      return;
    }

    clearMessages();
    setSuggestedParams(null);
    setPerModelParams(null);
    setSelectedSuggestionKey("default");
    const prompt = buildDatasetPrompt();
    const response = await sendMessage(prompt);
    
    // Try to extract JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.epochs || parsed.batchSize) {
          setSuggestedParams({
            epochs: parsed.epochs,
            batchSize: parsed.batchSize,
            imgSize: parsed.imgSize,
            learningRate: parsed.learningRate,
            workers: parsed.workers,
          });
        }
        if (parsed.perModel && typeof parsed.perModel === "object") {
          setPerModelParams(parsed.perModel as Record<string, HyperparametersSnapshot>);
        }
      }
    } catch {
      // JSON parsing failed, ignore
    }
  };

  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !isAvailable) return;

    const input = userInput.trim();
    setUserInput("");
    await sendMessage(input);
  };

  const handleApplySuggestions = () => {
    if (suggestedParams && onParamsSuggested) {
      const effectiveParams =
        selectedSuggestionKey === "default" || !perModelParams
          ? suggestedParams
          : perModelParams[selectedSuggestionKey] || suggestedParams;

      const selectedModelKey =
        selectedSuggestionKey === "default" || !perModelParams ? undefined : selectedSuggestionKey;

      onParamsSuggested(effectiveParams, selectedModelKey);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        disabled={isAvailable === false}
      >
        <Sparkles className="h-4 w-4" />
        Ask AI
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-2xl w-full sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Parameter Suggestions
            </SheetTitle>
            <SheetDescription>
              Get AI-powered hyperparameter recommendations based on your dataset
            </SheetDescription>
            <ProviderSelector
              provider={provider}
              onProviderChange={setProvider}
              isGeminiAvailable={isGeminiAvailable}
            />
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Click &quot;Analyze Dataset&quot; to get AI suggestions for optimal hyperparameters.
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary mt-1" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.role === "assistant" && lastProvider && (
                      <div className="text-xs text-muted-foreground mt-1">
                        (Gemini)
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs mt-1">
                        You
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary mt-1" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing dataset and generating suggestions...
                    </div>
                  </div>
                </div>
              )}

              {suggestedParams && (
                <div className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Suggested Parameters:</span>
                  </div>
                  {perModelParams && (
                    <div className="mb-3">
                      <label className="text-xs text-muted-foreground mr-2">Using config for:</label>
                      <select
                        className="border rounded px-2 py-1 text-xs bg-background"
                        value={selectedSuggestionKey}
                        onChange={(e) => setSelectedSuggestionKey(e.target.value)}
                      >
                        <option value="default">Default (dataset-based)</option>
                        {Object.keys(perModelParams).map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(() => {
                    const effective =
                      selectedSuggestionKey === "default" || !perModelParams
                        ? suggestedParams
                        : perModelParams[selectedSuggestionKey] || suggestedParams;
                    return (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {effective?.epochs && (
                      <div>
                        <span className="text-muted-foreground">Epochs:</span>{" "}
                        <span className="font-medium">{effective.epochs}</span>
                      </div>
                    )}
                    {effective?.batchSize && (
                      <div>
                        <span className="text-muted-foreground">Batch Size:</span>{" "}
                        <span className="font-medium">{effective.batchSize}</span>
                      </div>
                    )}
                    {effective?.imgSize && (
                      <div>
                        <span className="text-muted-foreground">Image Size:</span>{" "}
                        <span className="font-medium">{effective.imgSize}</span>
                      </div>
                    )}
                    {effective?.learningRate && (
                      <div>
                        <span className="text-muted-foreground">Learning Rate:</span>{" "}
                        <span className="font-medium">{effective.learningRate}</span>
                      </div>
                    )}
                    {effective?.workers && (
                      <div>
                        <span className="text-muted-foreground">Workers:</span>{" "}
                        <span className="font-medium">{effective.workers}</span>
                      </div>
                    )}
                  </div>
                    );
                  })()}
                </div>
              )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask about specific parameters..."
                className="min-h-[60px] resize-none"
                disabled={isLoading || !isAvailable}
              />
              <Button
                onClick={handleSend}
                disabled={!userInput.trim() || isLoading || !isAvailable}
                size="icon"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SheetFooter className="flex-row justify-between items-center">
            <div className="flex gap-2">
              {isLoading ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stop}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={!isAvailable}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Dataset
                </Button>
              )}
              {suggestedParams && onParamsSuggested && !isLoading && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplySuggestions}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Apply Suggestions
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};
