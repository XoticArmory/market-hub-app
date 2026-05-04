import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, File, FileSpreadsheet, Presentation, Upload, Trash2, Download,
  FolderOpen, Plus, X, Loader2, ShieldCheck, Search, Image,
} from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["General", "Contracts", "Guidelines", "Forms", "Policies", "Training", "Other"];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="w-5 h-5 text-blue-500" />;
  if (fileType.includes("excel") || fileType.includes("sheet") || fileType === "text/csv") return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-5 h-5 text-orange-500" />;
  if (fileType.startsWith("image/")) return <Image className="w-5 h-5 text-purple-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function getFileTypeBadge(fileType: string): string {
  if (fileType === "application/pdf") return "PDF";
  if (fileType.includes("word") || fileType.includes("document")) return "Word";
  if (fileType.includes("excel") || fileType.includes("sheet")) return "Excel";
  if (fileType === "text/csv") return "CSV";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PowerPoint";
  if (fileType.startsWith("image/")) return "Image";
  if (fileType === "text/plain") return "Text";
  return "File";
}

interface Doc {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: string | null;
  uploadedBy: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isAdmin = profile?.isAdmin === true;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    file: null as File | null,
  });

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file) throw new Error("No file selected");
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("title", form.title || form.file.name);
      if (form.description) fd.append("description", form.description);
      if (form.category) fd.append("category", form.category);
      const res = await fetch("/api/documents", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setForm({ title: "", description: "", category: "General", file: null });
      setShowUpload(false);
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  function handleFile(file: File) {
    setForm(f => ({ ...f, file, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const filtered = docs.filter(d => {
    const matchesSearch = !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === "all" || d.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(docs.map(d => d.category).filter(Boolean))) as string[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? "Manage and share documents with all VendorGrid users." : "Documents shared by the VendorGrid team."}
          </p>
        </div>
        {isAdmin && (
          <Button
            className="rounded-xl gap-2"
            onClick={() => setShowUpload(v => !v)}
            data-testid="button-toggle-upload"
          >
            {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showUpload ? "Cancel" : "Upload Document"}
          </Button>
        )}
      </div>

      {/* Upload Panel (admin only) */}
      {isAdmin && showUpload && (
        <Card className="rounded-2xl border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />Upload New Document
            </CardTitle>
            <CardDescription>Supports PDF, Word, Excel, PowerPoint, CSV, and text files up to 25 MB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-document"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                data-testid="input-document-file"
              />
              {form.file ? (
                <div className="flex items-center justify-center gap-3">
                  {getFileIcon(form.file.type)}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{form.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(form.file.size)}</p>
                  </div>
                  <button
                    className="ml-2 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, file: null })); }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">Drop a file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, CSV, Text — up to 25 MB</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Title</label>
                <Input
                  placeholder="Document title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="rounded-xl"
                  data-testid="input-doc-title"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl" data-testid="select-doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea
                placeholder="Brief description of this document…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="rounded-xl resize-none"
                rows={2}
                data-testid="input-doc-description"
              />
            </div>

            <div className="flex justify-end">
              <Button
                className="rounded-xl gap-2"
                disabled={!form.file || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
                data-testid="button-upload-doc"
              >
                {uploadMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" />Upload</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + filter */}
      {docs.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
              data-testid="input-doc-search"
            />
          </div>
          {categories.length > 0 && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="rounded-xl w-44" data-testid="select-doc-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <FolderOpen className="w-14 h-14 text-muted-foreground opacity-25" />
            <div>
              <p className="font-semibold text-foreground">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? "Upload a document above to share it with all users." : "The VendorGrid team hasn't uploaded any documents yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Search className="w-10 h-10 text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No results found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <Card key={doc.id} className="rounded-2xl hover:shadow-sm transition-shadow" data-testid={`card-doc-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                    {getFileIcon(doc.fileType)}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="font-semibold text-foreground leading-snug">{doc.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{getFileTypeBadge(doc.fileType)}</Badge>
                      {doc.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">{doc.category}</Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatBytes(doc.fileSize)} · Added {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.fileName}
                    >
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" data-testid={`button-download-doc-${doc.id}`}>
                        <Download className="w-3.5 h-3.5" />Download
                      </Button>
                    </a>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(doc.id)}
                        data-testid={`button-delete-doc-${doc.id}`}
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin badge */}
      {isAdmin && docs.length > 0 && (
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5 pb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          You are viewing as admin. Only you can upload or delete documents.
        </p>
      )}
    </div>
  );
}
