import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
  'text/plain': ['.txt'],
};

interface FileUploadZoneProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export function FileUploadZone({ onUpload, isUploading }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => onUpload([file]));
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    onDrop,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50',
        isUploading && 'opacity-50 cursor-not-allowed',
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="mx-auto h-10 w-10 text-muted-foreground mb-4 animate-spin" />
      ) : (
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
      )}
      <p className="text-sm text-muted-foreground">
        {isUploading
          ? 'Uploading...'
          : isDragActive
            ? 'Drop files here'
            : 'Drag & drop files, or click to select'}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        PDF, DOCX, MD, TXT up to 20MB
      </p>
    </div>
  );
}
