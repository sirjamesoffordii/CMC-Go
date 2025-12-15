import { useState, useCallback, useEffect } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob, croppedImageUrl: string, backgroundColor: string) => void;
  onCancel: () => void;
}

// Extract dominant colors from image edges
function extractEdgeColors(image: HTMLImageElement): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return ["#FFFFFF"];

  // Use smaller canvas for faster processing
  const sampleWidth = Math.min(image.width, 200);
  const sampleHeight = Math.min(image.height, 200);
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  
  ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const colorCounts: Record<string, number> = {};
  const edgeWidth = Math.max(10, Math.floor(sampleWidth * 0.1)); // 10% of width or minimum 10px

  // Sample left edge
  const leftData = ctx.getImageData(0, 0, edgeWidth, sampleHeight).data;
  for (let i = 0; i < leftData.length; i += 4) {
    const r = Math.round(leftData[i] / 16) * 16;
    const g = Math.round(leftData[i + 1] / 16) * 16;
    const b = Math.round(leftData[i + 2] / 16) * 16;
    const color = `rgb(${r},${g},${b})`;
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }

  // Sample right edge
  const rightData = ctx.getImageData(sampleWidth - edgeWidth, 0, edgeWidth, sampleHeight).data;
  for (let i = 0; i < rightData.length; i += 4) {
    const r = Math.round(rightData[i] / 16) * 16;
    const g = Math.round(rightData[i + 1] / 16) * 16;
    const b = Math.round(rightData[i + 2] / 16) * 16;
    const color = `rgb(${r},${g},${b})`;
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }

  // Sample top edge
  const topData = ctx.getImageData(0, 0, sampleWidth, edgeWidth).data;
  for (let i = 0; i < topData.length; i += 4) {
    const r = Math.round(topData[i] / 16) * 16;
    const g = Math.round(topData[i + 1] / 16) * 16;
    const b = Math.round(topData[i + 2] / 16) * 16;
    const color = `rgb(${r},${g},${b})`;
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }

  // Sample bottom edge
  const bottomData = ctx.getImageData(0, sampleHeight - edgeWidth, sampleWidth, edgeWidth).data;
  for (let i = 0; i < bottomData.length; i += 4) {
    const r = Math.round(bottomData[i] / 16) * 16;
    const g = Math.round(bottomData[i + 1] / 16) * 16;
    const b = Math.round(bottomData[i + 2] / 16) * 16;
    const color = `rgb(${r},${g},${b})`;
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }

  // Sort by frequency and get top colors
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([color]) => color);

  // Convert to hex for display
  const hexColors = sortedColors.map(rgb => {
    const match = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return "#FFFFFF";
  });

  // Add white and black as fallback options
  const finalColors = Array.from(new Set([...hexColors, "#FFFFFF", "#000000"])).slice(0, 10);
  
  return finalColors;
}

export function ImageCropModal({ open, imageSrc, onCropComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>(["#FFFFFF"]);
  const [selectedColor, setSelectedColor] = useState("#FFFFFF");

  // Extract colors when image loads
  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setSelectedColor("#FFFFFF");

      // Load image and extract colors
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const colors = extractEdgeColors(img);
        setExtractedColors(colors);
        // Auto-select the most common edge color
        if (colors.length > 0) {
          setSelectedColor(colors[0]);
        }
      };
      img.src = imageSrc;
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

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Fill with selected background color
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
            onCropComplete(blob, croppedImageUrl, selectedColor);
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

  const headerAspectRatio = 1280 / 90; // Match default header height

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crop Header Image</DialogTitle>
          <p className="text-sm text-gray-500">Position the red box over the part you want to use as the header</p>
        </DialogHeader>
        
        <div 
          className="relative rounded-lg overflow-hidden border border-gray-200" 
          style={{ height: "400px", backgroundColor: selectedColor }}
        >
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
                  backgroundColor: selectedColor,
                },
                cropAreaStyle: {
                  border: "3px solid #ED1C24",
                },
              }}
            />
          )}
        </div>

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

          {/* Background color picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Background Color (for gaps)</label>
            <p className="text-xs text-gray-500">Colors extracted from your image edges:</p>
            <div className="flex flex-wrap gap-2">
              {extractedColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded border-2 transition-all",
                    selectedColor === color 
                      ? "border-[#ED1C24] ring-2 ring-[#ED1C24] ring-offset-1" 
                      : "border-gray-300 hover:border-gray-400"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {/* Custom color input */}
              <div className="relative">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                  title="Pick custom color"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Selected: {selectedColor}</p>
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
