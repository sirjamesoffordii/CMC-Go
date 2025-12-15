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
  const [extendEdges, setExtendEdges] = useState(true); // Enable edge extension by default

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

  // Function to extend edge pixels horizontally
  const extendImageEdges = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    cropArea: Area,
    targetWidth: number,
    targetHeight: number
  ) => {
    // Calculate where the actual image content will be placed
    const imageAspect = image.width / image.height;
    const targetAspect = targetWidth / targetHeight;
    
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
    
    if (imageAspect > targetAspect) {
      // Image is wider - fit to width
      drawWidth = targetWidth;
      drawHeight = targetWidth / imageAspect;
      drawX = 0;
      drawY = (targetHeight - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawHeight = targetHeight;
      drawWidth = targetHeight * imageAspect;
      drawX = (targetWidth - drawWidth) / 2;
      drawY = 0;
    }

    // Fill with white background first
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw the main image centered
    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );

    // If there are gaps on the sides, extend the edge pixels
    if (drawX > 0) {
      // Get left edge pixel column and extend it
      const leftEdgeData = ctx.getImageData(Math.ceil(drawX), 0, 1, targetHeight);
      for (let x = 0; x < drawX; x++) {
        ctx.putImageData(leftEdgeData, x, 0);
      }

      // Get right edge pixel column and extend it
      const rightEdgeX = Math.floor(drawX + drawWidth) - 1;
      const rightEdgeData = ctx.getImageData(rightEdgeX, 0, 1, targetHeight);
      for (let x = Math.ceil(drawX + drawWidth); x < targetWidth; x++) {
        ctx.putImageData(rightEdgeData, x, 0);
      }
    }
  };

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

      // Target dimensions for the header (wide format)
      const targetWidth = Math.max(croppedAreaPixels.width, 1920);
      const targetHeight = croppedAreaPixels.height;

      // Set canvas size
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (extendEdges) {
        // Use edge extension to fill gaps
        extendImageEdges(ctx, image, croppedAreaPixels, targetWidth, targetHeight);
      } else {
        // Simple crop without extension - fill with white
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Center the cropped image
        const offsetX = (targetWidth - croppedAreaPixels.width) / 2;
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          offsetX,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
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
  const headerAspectRatio = 1280 / 120; // ~10.67:1 based on actual header dimensions

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crop Header Image</DialogTitle>
          <p className="text-sm text-gray-500">Drag to position the image, use the slider to zoom in or out</p>
        </DialogHeader>
        
        {/* Cropper container with fixed height - WHITE background */}
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
              Extend edge colors to fill gaps (recommended)
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
