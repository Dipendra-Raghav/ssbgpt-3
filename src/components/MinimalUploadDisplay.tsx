import React from 'react';
import { Check, FileImage, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadedFileProps {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  onRemove: (id: string) => void;
}

interface MinimalUploadDisplayProps {
  files: UploadedFileProps[];
  showRemoveButtons?: boolean;
}

export const MinimalUploadDisplay: React.FC<MinimalUploadDisplayProps> = ({ 
  files, 
  showRemoveButtons = true 
}) => {
  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-md border bg-background">
            {file.status === 'uploading' && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {file.status === 'success' && (
              <Check className="w-4 h-4 text-primary" />
            )}
            {file.status === 'error' && (
              <X className="w-4 h-4 text-destructive" />
            )}
          </div>
          {showRemoveButtons && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => file.onRemove(file.id)}
              className="h-6 w-6 p-0"
              aria-label={`Remove file`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};