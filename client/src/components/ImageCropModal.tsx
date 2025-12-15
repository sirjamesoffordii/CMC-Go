import { useState, useCallback, useEffect } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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

  // Reset when modal opens
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
      const image = new Image();
      image.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (e) => reject(e);
        image.src = imageSrc;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Simply crop what's in the selection box - no resizing, no edge extension
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Fill with white background first (in case of any transparency)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the cropped portion
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

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

  const headerAspectRatio = 1280 / 120;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crop Header Image</DialogTitle>
          <p className="text-sm text-gray-500">Position the red box over the part you want to use as the header</p>
        </DialogHeader>
        
        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200" style={{ height: "400px" }}>
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
              showGrid={true}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#f3f4f6",
                },
                cropAreaStyle: {
                  border: "3px solid #ED1C24",
                },
              }}
            />
          )}
        </div>

        <div className="py-4">
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
