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
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg border"
        >
          {/* File Icon */}
          <div className="flex-shrink-0">
            <FileImage className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {file.status === 'uploading' && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {file.status === 'success' && (
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            {file.status === 'error' && (
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Remove Button */}
          {showRemoveButtons && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => file.onRemove(file.id)}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};