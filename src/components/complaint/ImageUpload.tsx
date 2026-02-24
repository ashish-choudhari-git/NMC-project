import { useState, useRef } from "react";
import { Camera, X, Image as ImageIcon, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  userId: string;
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
}

const ImageUpload = ({ userId, onImageUploaded, currentImageUrl }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from("complaint-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("complaint-images")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);

      toast({
        title: "Image uploaded",
        description: "Your photo has been attached to the complaint.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {/* Gallery input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id="complaint-image-upload"
      />
      {/* Camera input */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        id="complaint-camera-upload"
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          <img
            src={previewUrl}
            alt="Complaint preview"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : uploading ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Uploading photo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label
            htmlFor="complaint-camera-upload"
            className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col items-center gap-2"
          >
            <Camera className="w-7 h-7 text-blue-600" />
            <p className="text-sm font-medium text-slate-700">Take Photo</p>
            <p className="text-xs text-slate-400">Use camera</p>
          </label>
          <label
            htmlFor="complaint-image-upload"
            className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col items-center gap-2"
          >
            <FolderOpen className="w-7 h-7 text-blue-600" />
            <p className="text-sm font-medium text-slate-700">Upload File</p>
            <p className="text-xs text-slate-400">From gallery</p>
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
