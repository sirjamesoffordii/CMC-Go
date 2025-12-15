import { useState, useCallback, useEffect } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob, croppedImageUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({ open, imageSrc, onCropComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extendEdges, setExtendEdges] = useState(true);

  // Reset crop position and zoom when modal opens with new image
  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      console.error("No cropped area or image source");
      return;
    }

    setIsProcessing(true);

    try {
      // Create image element
      const image = new Image();
      image.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (e) => reject(e);
        image.src = imageSrc;
      });

      // Create canvas for cropping
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // The cropped area from the image
      const cropX = croppedAreaPixels.x;
      const cropY = croppedAreaPixels.y;
      const cropWidth = croppedAreaPixels.width;
      const cropHeight = croppedAreaPixels.height;

      // Target width for header (full screen width)
      const targetWidth = 1920;
      // Keep the aspect ratio of the crop area for height
      const targetHeight = cropHeight;

      // Calculate how much wider the target is than the crop
      const widthRatio = targetWidth / cropWidth;

      if (extendEdges && widthRatio > 1.1) {
        // Need to extend edges - the crop is narrower than target
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill with white first
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate where to place the cropped image (centered)
        const drawX = (targetWidth - cropWidth) / 2;

        // Draw the main cropped image centered
        ctx.drawImage(
          image,
          cropX, cropY, cropWidth, cropHeight,
          drawX, 0, cropWidth, cropHeight
        );

        // Sample edge strips from the actual cropped image (not the canvas)
        const edgeWidth = Math.min(20, Math.floor(cropWidth * 0.1)); // 10% of crop width or 20px max

        // Create temporary canvas to extract edge colors from the SOURCE image
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCanvas.width = cropWidth;
          tempCanvas.height = cropHeight;
          
          // Draw just the cropped portion to temp canvas
          tempCtx.drawImage(
            image,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );

          // Get left edge strip from the cropped image
          const leftEdgeData = tempCtx.getImageData(0, 0, edgeWidth, cropHeight);
          
          // Get right edge strip from the cropped image  
          const rightEdgeData = tempCtx.getImageData(cropWidth - edgeWidth, 0, edgeWidth, cropHeight);

          // Extend left edge - draw the edge strip repeatedly
          for (let x = drawX - edgeWidth; x >= 0; x -= edgeWidth) {
            ctx.putImageData(leftEdgeData, x, 0);
          }
          // Fill any remaining gap on the left
          if (drawX % edgeWidth !== 0) {
            ctx.putImageData(leftEdgeData, 0, 0);
          }

          // Extend right edge - draw the edge strip repeatedly
          const rightStart = drawX + cropWidth;
          for (let x = rightStart; x < targetWidth; x += edgeWidth) {
            ctx.putImageData(rightEdgeData, x, 0);
          }
        }
      } else {
        // No extension needed - just use the crop as-is
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
          image,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
      }

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedImageUrl = URL.createObjectURL(blob);
            onCropComplete(blob, croppedImageUrl);
          } else {
            console.error("Failed to create blob");
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      setIsProcessing(false);
    }
  };

  // Use a more reasonable aspect ratio for the header
  const headerAspectRatio = 1280 / 120;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crop Header Image</DialogTitle>
          <p className="text-sm text-gray-500">Drag to position the image, use the slider to zoom in or out</p>
        </DialogHeader>
        
        {/* Cropper container - WHITE background */}
        <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200" style={{ height: "400px", minHeight: "300px" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={headerAspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropCompleteCallback}
              minZoom={0.1}
              maxZoom={3}
              restrictPosition={false}
              objectFit="horizontal-cover"
              showGrid={true}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#FFFFFF",
                },
                cropAreaStyle: {
                  border: "2px solid #ED1C24",
                },
                mediaStyle: {
                  backgroundColor: "#FFFFFF",
                },
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="py-4 space-y-4">
          {/* Zoom control */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium min-w-[60px]">Zoom</label>
            <Slider
              value={[zoom]}
              min={0.1}
              max={3}
              step={0.05}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 min-w-[40px]">{zoom.toFixed(2)}x</span>
          </div>

          {/* Edge extension toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="extend-edges"
              checked={extendEdges}
              onCheckedChange={setExtendEdges}
            />
            <Label htmlFor="extend-edges" className="text-sm">
              Extend edge colors to fill full width (recommended for narrow images)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={createCroppedImage} 
            className="bg-[#ED1C24] hover:bg-[#C91820]"
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? "Processing..." : "Save & Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
