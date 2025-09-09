import { useState, useCallback } from "react";

export interface UploadJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    url: string;
    public_id: string;
    thumbnail: string;
  };
  error?: string;
  createdAt: Date;
}

export interface UseAsyncUploadOptions {
  onComplete?: (result: UploadJob["result"]) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
  maxRetries?: number;
}

export const useAsyncUpload = (options: UseAsyncUploadOptions = {}) => {
  const {
    onComplete,
    onError,
    pollInterval = 2000, // Poll every 2 seconds
    maxRetries = 30, // Stop polling after 1 minute
  } = options;

  const [jobs, setJobs] = useState<Map<string, UploadJob>>(new Map());
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set());

  const checkJobStatus = useCallback(
    async (jobId: string): Promise<UploadJob | null> => {
      try {
        const response = await fetch(`/api/upload/status?jobId=${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to check upload status");
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error checking job status:", error);
        return null;
      }
    },
    []
  );

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollingJobs.has(jobId)) {
        return; // Already polling this job
      }

      setPollingJobs((prev) => new Set(prev).add(jobId));

      let retries = 0;
      const poll = async () => {
        if (retries >= maxRetries) {
          setPollingJobs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          onError?.(`Upload timeout for job ${jobId}`);
          return;
        }

        const job = await checkJobStatus(jobId);
        if (!job) {
          retries++;
          setTimeout(poll, pollInterval);
          return;
        }

        setJobs((prev) => new Map(prev).set(jobId, job));

        if (job.status === "completed") {
          setPollingJobs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          onComplete?.(job.result);
        } else if (job.status === "failed") {
          setPollingJobs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          onError?.(job.error || "Upload failed");
        } else {
          // Still processing, continue polling
          retries++;
          setTimeout(poll, pollInterval);
        }
      };

      // Start polling immediately
      poll();
    },
    [checkJobStatus, maxRetries, pollInterval, onComplete, onError, pollingJobs]
  );

  const getJobStatus = useCallback(
    (jobId: string): UploadJob | undefined => {
      return jobs.get(jobId);
    },
    [jobs]
  );

  const isPolling = useCallback(
    (jobId: string): boolean => {
      return pollingJobs.has(jobId);
    },
    [pollingJobs]
  );

  return {
    startPolling,
    getJobStatus,
    isPolling,
    jobs: Array.from(jobs.values()),
  };
};
