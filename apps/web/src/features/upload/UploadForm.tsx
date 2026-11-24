import { useState } from "react";
import { MediaDropzone } from "./MediaDropzone";
import { createJob, type CreateJobResponse, ApiError } from "../../lib/api/jobs";
import { FileVideo, FileAudio, X, Loader2, AlertCircle } from "lucide-react";

interface UploadFormProps {
  onJobCreated: (job: CreateJobResponse, file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm({ onJobCreated }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setUploadPercent(0);
    setLoadedBytes(0);
    setTotalBytes(file.size);
  };

  const handleRemoveFile = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setErrorMessage(null);
      setUploadPercent(0);
      setLoadedBytes(0);
      setTotalBytes(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadPercent(0);

    try {
      const response = await createJob(
        selectedFile,
        (percent, loaded, total) => {
          setUploadPercent(percent);
          setLoadedBytes(loaded);
          setTotalBytes(total);
        }
      );
      onJobCreated(response, selectedFile);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred during upload.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isVideo = selectedFile?.type.startsWith("video") ||
    selectedFile?.name.endsWith(".mp4") ||
    selectedFile?.name.endsWith(".mov");

  return (
    <div className="w-full space-y-5">
      {!selectedFile ? (
        <MediaDropzone onFileSelected={handleFileSelected} disabled={isUploading} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                {isVideo ? <FileVideo className="h-5 w-5" /> : <FileAudio className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(selectedFile.size)} • {isVideo ? "Video" : "Audio"}
                </p>
              </div>
            </div>

            {!isUploading && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Remove selected file"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Upload Progress Bar (shown only while uploading) */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading media stream...</span>
                <span className="font-mono font-medium">
                  {formatBytes(loadedBytes)} / {formatBytes(totalBytes)} ({uploadPercent}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150 ease-out"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isUploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Streaming media directly to storage...</span>
                </>
              ) : (
                <span>Start Subtitling Job</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
