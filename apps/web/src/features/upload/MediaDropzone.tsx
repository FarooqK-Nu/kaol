import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileAudio, FileVideo, AlertCircle } from "lucide-react";

export const ALLOWED_EXTENSIONS = [".mp4", ".wav", ".mp3", ".m4a", ".mov"];
export const MAX_UPLOAD_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 200;

interface MediaDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function MediaDropzone({ onFileSelected, disabled = false }: MediaDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(
        `Unsupported file type "${ext}". Please select an MP4, WAV, MP3, M4A, or MOV file.`
      );
      return false;
    }

    const maxBytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setValidationError(
        `File exceeds maximum permitted size of ${MAX_UPLOAD_SIZE_MB}MB.`
      );
      return false;
    }

    setValidationError(null);
    return true;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    },
    [validateFile, onFileSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload media file"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            : isDragOver
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.01]"
            : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.wav,.mp3,.m4a,.mov,video/mp4,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,video/quicktime"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          className="hidden"
          aria-hidden="true"
        />

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
            isDragOver ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <UploadCloud className="h-6 w-6" />
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-xs text-slate-500">
            Arabic audio or video file (MP4, WAV, MP3, M4A, MOV)
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FileVideo className="h-3.5 w-3.5" /> MP4, MOV
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <FileAudio className="h-3.5 w-3.5" /> WAV, MP3, M4A
          </span>
          <span>•</span>
          <span>Max {MAX_UPLOAD_SIZE_MB}MB</span>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
