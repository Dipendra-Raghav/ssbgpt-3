import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const useUploadManager = (sessionId: string) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const fileId = crypto.randomUUID();
    setIsUploading(true);
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${sessionId}_${Date.now()}.${fileExt}`;
      
      // Simulate progress updates
      setUploadProgress(prev => ({ ...prev, [fileId]: 25 }));
      
      const { error: uploadError } = await supabase.storage
        .from('test-responses')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(prev => ({ ...prev, [fileId]: 75 }));

      const { data: { publicUrl } } = supabase.storage
        .from('test-responses')
        .getPublicUrl(fileName);

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
      }, 1000);

      return { success: true, url: publicUrl };
    } catch (error: any) {
      setUploadProgress(prev => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
    }
  }, [user, sessionId]);

  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);
      
      // Show individual file status
      if (result.success) {
        toast({
          title: 'Upload Successful',
          description: `${file.name} uploaded successfully.`,
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}: ${result.error}`,
          variant: 'destructive',
        });
      }
    }
    
    return results;
  }, [uploadFile]);

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    uploadProgress
  };
};