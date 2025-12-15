import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.5); // Start zoomed out to fit image
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

      // Set canvas size to cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped portion of the image
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crop Header Image</DialogTitle>
        </DialogHeader>
        
        {/* Cropper container with fixed height */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ height: "400px", minHeight: "300px" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={10 / 1.2}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropCompleteCallback}
              minZoom={0.5}
              maxZoom={3}
              objectFit="contain"
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#1a1a1a",
                },
              }}
            />
          )}
        </div>

        {/* Zoom control */}
        <div className="py-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium min-w-[60px]">Zoom</label>
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 min-w-[40px]">{zoom.toFixed(1)}x</span>
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
