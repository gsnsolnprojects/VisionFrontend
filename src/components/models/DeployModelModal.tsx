import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Rocket, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as modelsApi from "@/lib/api/models";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Device {
  ipAddress: string;
  deviceName?: string;
  hasFolderAccess: boolean;
  folderPath?: string;
  status: "available" | "unavailable" | "checking";
  lastChecked?: string;
}

interface DeployModelModalProps {
  modelId: string;
  modelName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (deviceIp: string, folderPath: string) => Promise<void>;
}

export const DeployModelModal: React.FC<DeployModelModalProps> = ({
  modelId,
  modelName,
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchIp, setSearchIp] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<'pt' | 'onnx'>('pt');
  const [targetFileName, setTargetFileName] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setTargetFileName(selectedFormat === "onnx" ? `${modelName}.onnx` : `${modelName}.pt`);
  }, [selectedFormat, modelName]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Calculate network range from IP address
   * Example: 192.168.1.14 → 192.168.1.0/24
   */
  const calculateNetworkRange = (ipAddress: string): string | null => {
    const parts = ipAddress.trim().split('.');
    if (parts.length === 4) {
      // Validate each part is a number between 0-255
      const isValid = parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
      });
      
      if (isValid) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
    }
    return null; // Invalid IP format
  };

  const scanNetwork = async () => {
    setIsScanning(true);
    setError(null);

    try {
      // Prepare options for API call
      const options: {
        networkRange?: string;
        folderName?: string;
      } = {
        folderName: 'shared models' // Backend expects this parameter
      };

      // If IP address is entered, calculate network range from it
      if (searchIp.trim()) {
        const networkRange = calculateNetworkRange(searchIp.trim());
        if (networkRange) {
          options.networkRange = networkRange;
        } else {
          // Invalid IP format - show warning but still try to scan
          setError("Invalid IP format. Scanning default network...");
        }
      }

      // Call API with network range and folder name
      const data = await modelsApi.scanNetworkDevices(modelId, options);
      setDevices(data.devices || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to scan network. Please try searching by IP address.";
      setError(errorMessage);
      console.error("Network scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const searchByIp = async () => {
    if (!searchIp.trim()) {
      setError("Please enter an IP address");
      return;
    }

    // Validate IP format (basic validation)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(searchIp.trim())) {
      setError("Invalid IP address format");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const device = await modelsApi.checkDeviceByIp(modelId, searchIp.trim());

      // Add or update device in list
      setDevices((prev) => {
        const existing = prev.find((d) => d.ipAddress === device.ipAddress);
        if (existing) {
          return prev.map((d) =>
            d.ipAddress === device.ipAddress ? device : d
          );
        }
        return [...prev, device];
      });

      setSearchIp(""); // Clear search input
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check device";
      setError(errorMessage);
      console.error("Device check error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedDevice) {
      setError("Please select a device");
      return;
    }

    const device = devices.find((d) => d.ipAddress === selectedDevice);
    if (!device || !device.hasFolderAccess || !device.folderPath) {
      setError("Selected device does not have folder access");
      return;
    }
    if (!targetFileName.trim()) {
      setError("Please enter a target file name");
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      await modelsApi.deployModelToDevice(modelId, {
        ipAddress: device.ipAddress,
        folderPath: device.folderPath,
        deviceName: device.deviceName,
        format: selectedFormat,
        targetFileName: targetFileName.trim(),
      });

      // Call parent callback
      await onDeploy(device.ipAddress, device.folderPath);

      toast({
        title: "Deployment started",
        description: `Model is being deployed to ${device.ipAddress} in ${selectedFormat === 'pt' ? 'PyTorch' : 'ONNX'} format`,
      });

      // Close modal on success
      onClose();
      // Reset state
      setSelectedDevice(null);
      setDevices([]);
      setSearchIp("");
      setSelectedFormat("pt");
      setTargetFileName(`${modelName}.pt`);
    } catch (err) {
      let errorMessage =
        err instanceof Error ? err.message : "Failed to deploy model";

      // Provide a user-friendly message for permission errors from the backend
      if (
        typeof errorMessage === "string" &&
        (errorMessage.toLowerCase().includes("eperm") ||
          errorMessage.toLowerCase().includes("operation not permitted") ||
          errorMessage.toLowerCase().includes("copyfile"))
      ) {
        errorMessage =
          "Deployment failed because the server does not have permission to write to the shared folder on the target device. " +
          "Please check the network share path and ensure the backend service account has write access, then try again.";
      }

      setError(errorMessage);
      console.error("Deployment error:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    if (!isDeploying) {
      onClose();
      setSelectedDevice(null);
      setDevices([]);
      setSearchIp("");
      setSelectedFormat("pt");
      setTargetFileName(`${modelName}.pt`);
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Deploy Model to Device</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-sm">
                  <p className="text-xs">
                    Create a shared folder on the target device before deploying. The backend requires write access to copy the model files. For setup instructions, refer to the help manual.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            Deploy Model: {modelName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search/Scan Controls */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter IP address (e.g., 192.168.1.100)"
              value={searchIp}
              onChange={(e) => setSearchIp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSearching && !isScanning) {
                  searchByIp();
                }
              }}
              disabled={isSearching || isScanning || isDeploying}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={searchByIp}
              disabled={isSearching || isScanning || isDeploying || !searchIp.trim()}
              variant="outline"
              size="default"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search IP"
              )}
            </Button>
            <Button
              onClick={scanNetwork}
              disabled={isScanning || isSearching || isDeploying}
              variant="outline"
              size="default"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Scan Network"
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Devices List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Available Devices:</h3>

            {devices.length === 0 && !isScanning && !isSearching && (
              <p className="text-sm text-muted-foreground">
                No devices found. Try scanning the network or searching by IP
                address.
              </p>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {devices.map((device) => (
                <div
                  key={device.ipAddress}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedDevice === device.ipAddress
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${
                    !device.hasFolderAccess
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() =>
                    device.hasFolderAccess &&
                    setSelectedDevice(device.ipAddress)
                  }
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDevice === device.ipAddress}
                      disabled={!device.hasFolderAccess || isDeploying}
                      onCheckedChange={(checked) => {
                        if (checked && device.hasFolderAccess) {
                          setSelectedDevice(device.ipAddress);
                        } else {
                          setSelectedDevice(null);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{device.ipAddress}</span>
                        {device.deviceName && (
                          <span className="text-muted-foreground">
                            - {device.deviceName}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm">
                        {device.hasFolderAccess ? (
                          <>
                            <span className="text-green-600 dark:text-green-400">
                              ✓ Folder Access Available
                            </span>
                            {device.folderPath && (
                              <div className="text-muted-foreground mt-1">
                                Path:{" "}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {device.folderPath}
                                </code>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-destructive">
                            ✗ No Folder Access
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection - Only show when device is selected */}
          {selectedDevice && (
            <div className="pt-3 border-t">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Deploy Format:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="pt"
                      checked={selectedFormat === 'pt'}
                      onChange={() => setSelectedFormat('pt')}
                      disabled={isDeploying}
                      className="cursor-pointer"
                    />
                    <span>PyTorch (.pt)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="onnx"
                      checked={selectedFormat === 'onnx'}
                      onChange={() => setSelectedFormat('onnx')}
                      disabled={isDeploying}
                      className="cursor-pointer"
                    />
                    <span>ONNX (.onnx)</span>
                  </label>
                </div>
                {selectedFormat === 'onnx' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ONNX format will be converted automatically if not available
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target File Name
                </label>
                <Input
                  type="text"
                  value={targetFileName}
                  onChange={(e) => setTargetFileName(e.target.value)}
                  placeholder={selectedFormat === "onnx" ? `${modelName}.onnx` : `${modelName}.pt`}
                  disabled={isDeploying}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter>
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!selectedDevice || !targetFileName.trim() || isDeploying}
            className="gap-2"
          >
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Deploy to Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
