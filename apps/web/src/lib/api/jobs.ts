import type { JobStatus, PublicError } from "@kaol/shared-types";

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}

export type ProgressCallback = (percent: number, loadedBytes: number, totalBytes: number) => void;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Uploads a media file directly to POST /api/jobs using XMLHttpRequest
 * to stream bytes while tracking genuine HTTP byte transfer progress.
 */
export function createJob(
  file: File,
  onProgress?: ProgressCallback
): Promise<CreateJobResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", "/api/jobs", true);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      try {
        const responseData = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(responseData as CreateJobResponse);
        } else {
          const publicError = (responseData as { error?: PublicError }).error;
          const code = publicError?.code || "UPLOAD_FAILED";
          const message = publicError?.message || `Server returned error status ${xhr.status}`;
          reject(new ApiError(code, message));
        }
      } catch (_err) {
        reject(
          new ApiError(
            "INVALID_RESPONSE",
            `Received non-JSON response from server (HTTP ${xhr.status})`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new ApiError("NETWORK_ERROR", "Network request failed. Is the API server reachable?"));
    };

    xhr.onabort = () => {
      reject(new ApiError("UPLOAD_ABORTED", "Upload was aborted."));
    };

    xhr.send(formData);
  });
}
