'use client';

import { useRef, useCallback, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export default function LogUpload({ onUpload, isUploading }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) onUpload(files[0]);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) onUpload(files[0]);
    },
    [onUpload]
  );

  return (
    <div
      className={`log-upload-zone ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".log,.txt,.json,.csv"
        onChange={handleFileSelect}
        className="hidden-input"
      />
      <div className="upload-content">
        {isUploading ? (
          <>
            <span className="upload-spinner">⏳</span>
            <span>Uploading and indexing...</span>
          </>
        ) : (
          <>
            <span className="upload-icon">📁</span>
            <span>Drop log files here or click to upload</span>
            <span className="upload-hint">.log, .txt, .json, .csv</span>
          </>
        )}
      </div>
    </div>
  );
}
