import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { Navigate } from "react-router-dom";
import PIQDisplay from "@/components/PIQDisplay";
import PIQForm from "@/pages/PIQForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

const PIQ = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'loading' | 'new' | 'view' | 'edit'>('loading');
  const [piqData, setPiqData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      checkPIQStatus();
    }
  }, [user]);

  const checkPIQStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('piq_forms')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setPiqData(data);
        setMode('view');
      } else {
        setMode('new');
      }
    } catch (error) {
      console.error('Error checking PIQ status:', error);
      setMode('new');
    }
  };

  const handleEdit = () => {
    setMode('edit');
  };

  const handleFormComplete = () => {
    // Refresh PIQ data and switch to view mode
    checkPIQStatus();
  };

  const handleBackToView = () => {
    setMode('view');
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (mode === 'loading') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p>Loading PIQ status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'view' && piqData) {
    return (
      <PIQDisplay 
        data={piqData} 
        onEdit={handleEdit}
      />
    );
  }

  if (mode === 'edit' || mode === 'new') {
    return (
      <PIQForm 
        onComplete={handleFormComplete}
        onCancel={mode === 'edit' ? handleBackToView : undefined}
        isEdit={mode === 'edit'}
      />
    );
  }

  // Fallback for new PIQ
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Personal Information Questionnaire
          </CardTitle>
          <CardDescription>
            Complete your PIQ form to proceed with the assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You haven't submitted your PIQ form yet. Please complete it to continue.</p>
          <Button onClick={() => setMode('new')}>
            Start PIQ Form
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PIQ;