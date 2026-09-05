import { useRef, useState } from "react";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export type DocumentVisibility = "public" | "paid" | "registered";

export interface PendingEventDocument {
  id: string;
  file: File;
  title: string;
  visibility: DocumentVisibility;
}

export interface EventDocument {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  visibility: DocumentVisibility;
  downloadUrl: string;
}

const visibilityLabels: Record<DocumentVisibility, string> = {
  public: "All users",
  paid: "Paid users",
  registered: "Registered users",
};

export async function uploadEventDocument(eventId: number, document: PendingEventDocument) {
  const body = new FormData();
  body.append("file", document.file);
  body.append("title", document.title.trim() || document.file.name);
  body.append("visibility", document.visibility);
  const response = await fetch(`/api/events/${eventId}/documents`, {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to upload ${document.file.name}`);
  }
  return response.json();
}

export function PendingEventDocumentEditor({
  documents,
  onChange,
}: {
  documents: PendingEventDocument[];
  onChange: (documents: PendingEventDocument[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const additions = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      title: file.name,
      visibility: "public" as const,
    }));
    onChange([...documents, ...additions]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div>
        <p className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Event Documents</p>
        <p className="text-xs text-muted-foreground mt-1">Attach forms, rules, maps, or setup instructions. Up to 25 MB each.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,image/*"
        onChange={(event) => addFiles(event.target.files)}
      />
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()}>
        <Plus className="w-4 h-4 mr-2" />Attach documents
      </Button>
      {documents.map((document) => (
        <div key={document.id} className="grid gap-2 sm:grid-cols-[1fr_180px_auto] items-center rounded-xl border bg-background p-3">
          <Input
            value={document.title}
            aria-label="Document title"
            onChange={(event) => onChange(documents.map((item) => item.id === document.id ? { ...item, title: event.target.value } : item))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={document.visibility}
            aria-label="Document visibility"
            onChange={(event) => onChange(documents.map((item) => item.id === document.id ? { ...item, visibility: event.target.value as DocumentVisibility } : item))}
          >
            {Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${document.file.name}`} onClick={() => onChange(documents.filter((item) => item.id !== document.id))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <p className="sm:col-span-3 text-xs text-muted-foreground truncate">{document.file.name}</p>
        </div>
      ))}
    </div>
  );
}

export function SavedEventDocumentManager({
  eventId,
  documents,
  onChanged,
}: {
  eventId: number;
  documents: EventDocument[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingEventDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function uploadAll() {
    setUploading(true);
    try {
      await Promise.all(pending.map((document) => uploadEventDocument(eventId, document)));
      setPending([]);
      onChanged();
      toast({ title: "Documents attached" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(document: EventDocument) {
    setDeletingId(document.id);
    try {
      const response = await fetch(`/api/events/${eventId}/documents/${document.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to remove document.");
      }
      onChanged();
      toast({ title: "Document removed" });
    } catch (error: any) {
      toast({ title: "Could not remove document", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <PendingEventDocumentEditor documents={pending} onChange={setPending} />
      {pending.length > 0 && (
        <Button type="button" onClick={uploadAll} disabled={uploading} className="rounded-xl">
          {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Upload {pending.length} document{pending.length === 1 ? "" : "s"}
        </Button>
      )}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Attached documents</p>
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{document.title}</p>
                <p className="text-xs text-muted-foreground">{visibilityLabels[document.visibility] || document.visibility}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" disabled={deletingId === document.id} onClick={() => removeDocument(document)}>
                {deletingId === document.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}