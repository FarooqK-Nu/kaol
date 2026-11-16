export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class StoragePathTraversalError extends StorageError {
  constructor(message: string = "Directory traversal attempt detected") {
    super(message);
    this.name = "StoragePathTraversalError";
  }
}

export class StorageFileNotFoundError extends StorageError {
  constructor(jobId: string, filename: string) {
    super(`File "${filename}" not found in job workspace "${jobId}"`);
    this.name = "StorageFileNotFoundError";
  }
}

export class InvalidJobIdError extends StorageError {
  constructor(message: string = "Invalid job ID format or length") {
    super(message);
    this.name = "InvalidJobIdError";
  }
}

export class InvalidFilenameError extends StorageError {
  constructor(message: string = "Invalid filename format") {
    super(message);
    this.name = "InvalidFilenameError";
  }
}
