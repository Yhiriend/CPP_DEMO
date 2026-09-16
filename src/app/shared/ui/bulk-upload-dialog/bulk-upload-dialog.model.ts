export interface BulkUploadValidRow<T> {
  readonly row: number;
  readonly data: T;
}

export interface BulkUploadRejectedRow {
  readonly row: number;
  readonly reason: string;
}

export interface BulkUploadOutcome<T> {
  readonly valid: readonly BulkUploadValidRow<T>[];
  readonly rejected: readonly BulkUploadRejectedRow[];
}
