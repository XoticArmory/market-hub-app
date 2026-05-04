import { useRef, useState } from "react";
import { UploadCloud, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  "data-testid"?: string;
}

export function ImageUpload({ value, onChange, disabled, "data-testid": testId }: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 8 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed.");
      const { url } = await res.json();
      onChange(url);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled || uploading}
        data-testid={testId ? `${testId}-input` : undefined}
      />

      {value ? (
        <div className="relative w-full aspect-video max-h-48 rounded-xl overflow-hidden border border-border/50 bg-muted">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
              data-testid={testId ? `${testId}-remove` : undefined}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-muted/50"}
            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          data-testid={testId ? `${testId}-dropzone` : undefined}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drag & drop a photo here</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse — JPG, PNG, GIF, WebP up to 8 MB</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="rounded-lg mt-1 pointer-events-none">
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />Browse Files
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
