"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function NotebookPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const notebookUrl =
    process.env.NEXT_PUBLIC_NOTEBOOK_URL || "http://localhost:3001";

  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
    setHasError(false);
  }, [notebookUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="relative w-full h-[calc(100vh-0px)]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-sm text-gray-600">Loading notebook...</p>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">
              Unable to load notebook
            </p>
            <p className="text-sm text-gray-600">
              Make sure the notebook app is running at {notebookUrl}
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                const iframe = document.getElementById(
                  "notebook-iframe"
                ) as HTMLIFrameElement;
                if (iframe) {
                  iframe.src = notebookUrl;
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <iframe
        id="notebook-iframe"
        src={notebookUrl}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="clipboard-read; clipboard-write"
        title="Notebook Canvas"
      />
    </div>
  );
}

