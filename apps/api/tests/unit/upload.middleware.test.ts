import { describe, it, expect } from "bun:test";
import { ALLOWED_EXTENSIONS, UploadError } from "../../src/middleware/upload.middleware";

describe("Upload Middleware Constants and Errors", () => {
  it("defines the canonical allowed media extensions", () => {
    expect(ALLOWED_EXTENSIONS).toContain(".mp4");
    expect(ALLOWED_EXTENSIONS).toContain(".wav");
    expect(ALLOWED_EXTENSIONS).toContain(".mp3");
    expect(ALLOWED_EXTENSIONS).toContain(".m4a");
    expect(ALLOWED_EXTENSIONS).toContain(".mov");
    expect(ALLOWED_EXTENSIONS.length).toBe(5);
  });

  it("creates UploadError with status code, code, and message", () => {
    const error = new UploadError(400, "UNSUPPORTED_MEDIA_TYPE", "Invalid extension");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(error.message).toBe("Invalid extension");
    expect(error.name).toBe("UploadError");
  });
});
