import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, File, FileSpreadsheet, Presentation, Upload, Trash2,
  Download, FolderOpen, Plus, X, Loader2, Copy, Check, Lock, Image,
  Search, Crown,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string, size = "w-5 h-5") {
  if (fileType === "application/pdf") return <FileText className={`${size} text-red-500`} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className={`${size} text-blue-500`} />;
  if (fileType.includes("excel") || fileType.includes("sheet") || fileType === "text/csv") return <FileSpreadsheet className={`${size} text-green-600`} />;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className={`${size} text-orange-500`} />;
  if (fileType.startsWith("image/")) return <Image className={`${size} text-purple-500`} />;
  return <File className={`${size} text-muted-foreground`} />;
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

interface UserFile {
  id: number;
  userId: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  createdAt: string;
}

function CopyLinkButton({ url, id }: { url: string; id: number }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl gap-1.5 h-8 text-xs"
      onClick={handleCopy}
      title="Copy shareable link"
      data-testid={`button-copy-link-${id}`}
    >
      {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy Link</>}
    </Button>
  );
}

export default function MyFilesPage() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isAdmin = profile?.isAdmin === true;
  const isPro = isAdmin || (profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ title: "", file: null as File | null });

  const { data: files = [], isLoading } = useQuery<UserFile[]>({
    queryKey: ["/api/my-files"],
    enabled: !!isPro,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file) throw new Error("No file selected");
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("title", form.title || form.file.name);
      const res = await fetch("/api/my-files", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "File uploaded to your folder" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-files"] });
      setForm({ title: "", file: null });
      setShowUpload(false);
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/my-files/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "File deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-files"] });
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

  const filtered = files.filter(f =>
    !searchQuery ||
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = files.reduce((s, f) => s + f.fileSize, 0);

  // Not Pro — show upgrade prompt
  if (!isPro && profile !== undefined) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">My File Folder</h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your private file folder is a VendorGrid Pro feature. Upgrade to store documents,
              contracts, and files — and share them instantly when VendorGrid requests them.
            </p>
            <Link href="/upgrade">
              <Button className="rounded-xl gap-2" size="lg" data-testid="button-upgrade-for-files">
                <Crown className="w-4 h-4" />Upgrade to Pro
              </Button>
            </Link>
          </div>
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-foreground mb-3">What you get with My File Folder:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Private storage — only you can see your files",
                "Upload PDFs, Word docs, Excel sheets, images & more",
                "One-click shareable links for each file",
                "Share file locations with VendorGrid instantly",
                "Up to 25 MB per file",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            My File Folder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your private storage — only you can see these files.
            {files.length > 0 && <span className="ml-1">{files.length} file{files.length !== 1 ? "s" : ""} · {formatBytes(totalSize)} used</span>}
          </p>
        </div>
        <Button
          className="rounded-xl gap-2"
          onClick={() => setShowUpload(v => !v)}
          data-testid="button-toggle-my-upload"
        >
          {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showUpload ? "Cancel" : "Upload File"}
        </Button>
      </div>

      {/* Share tip */}
      {files.length > 0 && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Copy className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Use <span className="font-semibold text-foreground">Copy Link</span> on any file to get a shareable URL — paste it anywhere VendorGrid asks for a file location.
          </p>
        </div>
      )}

      {/* Upload Panel */}
      {showUpload && (
        <Card className="rounded-2xl border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />Upload to My Folder
            </CardTitle>
            <CardDescription>PDF, Word, Excel, PowerPoint, CSV, images — up to 25 MB. Private to you only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-my-file"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                data-testid="input-my-file"
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
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, CSV, Text, Images — up to 25 MB</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Title <span className="font-normal text-muted-foreground">(optional — defaults to file name)</span></label>
              <Input
                placeholder="Give this file a name…"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="rounded-xl"
                data-testid="input-my-file-title"
              />
            </div>

            <div className="flex justify-end">
              <Button
                className="rounded-xl gap-2"
                disabled={!form.file || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
                data-testid="button-upload-my-file"
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

      {/* Search */}
      {files.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your files…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
            data-testid="input-my-file-search"
          />
        </div>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : files.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <FolderOpen className="w-14 h-14 text-muted-foreground opacity-25" />
            <div>
              <p className="font-semibold text-foreground">Your folder is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first file to get started.</p>
            </div>
            <Button variant="outline" className="rounded-xl gap-2 mt-2" onClick={() => setShowUpload(true)} data-testid="button-empty-upload">
              <Plus className="w-4 h-4" />Upload a File
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Search className="w-10 h-10 text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No files match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(file => (
            <Card key={file.id} className="rounded-2xl hover:shadow-sm transition-shadow" data-testid={`card-my-file-${file.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                    {getFileIcon(file.fileType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground leading-snug truncate">{file.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{getFileTypeBadge(file.fileType)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatBytes(file.fileSize)} · Uploaded {format(new Date(file.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <CopyLinkButton url={file.fileUrl} id={file.id} />
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download={file.fileName}>
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" data-testid={`button-download-my-file-${file.id}`}>
                        <Download className="w-3.5 h-3.5" />Download
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(file.id)}
                      data-testid={`button-delete-my-file-${file.id}`}
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Privacy note */}
      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5 pb-2">
        <Lock className="w-3.5 h-3.5" />
        Your files are private. Only you can see, manage, or delete them.
      </p>
    </div>
  );
}
