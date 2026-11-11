import React, { useState, useRef } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function ImagesCard({ images, onChange, readOnly }) {
  const fileRef = useRef(null);
  const [pendingUrl, setPendingUrl] = useState(null);
  const [pendingDesc, setPendingDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPendingUrl(file_url);
      setPendingDesc("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmAdd = () => {
    if (!pendingUrl) return;
    onChange([...(images || []), { url: pendingUrl, description: pendingDesc.trim() }]);
    setPendingUrl(null);
    setPendingDesc("");
  };

  const removeAt = (i) => onChange((images || []).filter((_, idx) => idx !== i));

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Images</p>
      {!readOnly && (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-border/60 rounded-xl py-4 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-xs">{uploading ? "Chargement…" : "Ajouter une image"}</span>
          </button>
          {pendingUrl && (
            <div className="space-y-2">
              <img src={pendingUrl} alt="aperçu" className="w-full max-h-40 object-contain rounded-lg border" />
              <Input
                value={pendingDesc}
                onChange={(e) => setPendingDesc(e.target.value)}
                placeholder="Description de l'image"
                className="text-sm"
              />
              <button
                onClick={confirmAdd}
                disabled={!pendingUrl}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-60 transition-colors"
              >
                Ajouter
              </button>
            </div>
          )}
        </>
      )}
      {(images || []).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {(images || []).map((img, i) => (
            <div key={i} className="relative rounded-lg border overflow-hidden">
              <img src={img.url} alt={img.description || ""} className="w-full h-28 object-cover" />
              {img.description && (
                <p className="text-[11px] text-muted-foreground px-2 py-1 truncate">{img.description}</p>
              )}
              {!readOnly && (
                <button
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-red-500 hover:bg-white"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}