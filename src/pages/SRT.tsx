import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Target, Timer, Send, Play, Camera, FileImage, SkipForward, Square, Minimize2, Maximize2 } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useTestPersistence } from '@/hooks/useTestPersistence';
import { useFullscreen } from '@/hooks/useFullscreen';
import { EvaluationLoading } from '@/components/ui/evaluation-loading';
import { useCredits } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { CreditPopup } from '@/components/CreditPopup';
import { TestImageUpload } from '@/components/TestImageUpload';

interface SRTSituation {
  id: string;
  situation_text: string;
  difficulty_level: string;
}

const SRT = () => {
  const { user } = useAuth();
  const { credits, fetchCredits, consumeCredit } = useCredits();
  const { hasActivePlan } = useSubscription();
  const [situations, setSituations] = useState<SRTSituation[]>([]);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0); // Total time for all situations
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCountSelector, setShowCountSelector] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [testInProgress, setTestInProgress] = useState(false);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const { isFullscreen, isSupported, toggleFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
  const [isPaused, setIsPaused] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // Use persistence hook
  const { testState, updateTestState, resetTestState } = useTestPersistence('srt', {
    hasStarted: false,
    currentIndex: 0,
    completedCount: 0,
    responses: [],
    practiceCount: 5,
    sessionId: crypto.randomUUID(),
    response: ''
  });

  const { hasStarted, currentIndex, completedCount, responses, practiceCount, sessionId, response } = testState;

  // Restore UI state if test was already started
  useEffect(() => {
    if (hasStarted) {
      setShowCountSelector(false);
    }
  }, [hasStarted]);

  // Resume session if user returns mid-test
  useEffect(() => {
    const resume = async () => {
      if (!hasStarted) return;
      setShowCountSelector(false);
      if (situations.length === 0) {
        await fetchSituations();
      }
      const isComplete = completedCount >= practiceCount;
      if (!isActive && !isComplete) {
        setIsActive(true);
        setTotalTimeLeft(practiceCount * 15); // 15 seconds per question
      }
    };
    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  // Fetch SRT situations

  // Fetch SRT situations
  const fetchSituations = async () => {
    try {
      const { data, error } = await supabase
        .from('srt_situations')
        .select('*')
        .limit(practiceCount);

      if (error) throw error;
      setSituations(data || []);
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load SRT situations. Please try again.',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Upload image to storage
  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${sessionId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('test-responses')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-responses')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Timer logic - Total test time (15 minutes per situation)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && totalTimeLeft > 0) {
      interval = setInterval(() => {
        setTotalTimeLeft(time => time - 1);
      }, 1000);
    } else if (isActive && totalTimeLeft === 0) {
      // Auto-finish when total time is up
      finishEarlyTest();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, totalTimeLeft]);

  const [starting, setStarting] = useState(false);

  const checkCreditsAndStart = async () => {
    if (hasActivePlan()) {
      startTest();
      return;
    }

    // Validate requested count before consuming credits
    const maxSituations = getMaxAllowedSituations();
    if (practiceCount > maxSituations) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxSituations} situations with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    if (!credits || credits.srt_credits <= 0) {
      setShowCreditPopup(true);
      return;
    }

    try {
      setStarting(true);
      const result = await consumeCredit('srt');
      if (result.success) {
        await startTest();
        await fetchCredits();
      } else {
        setShowCreditPopup(true);
      }
    } catch (error) {
      console.error('Error consuming credit:', error);
      setShowCreditPopup(true);
    } finally {
      setStarting(false);
    }
  };

  const getMaxAllowedSituations = () => {
    if (hasActivePlan()) return 20; // Premium users can select up to 20
    if (!credits) return 1;
    
    // Free users limited by their remaining credits
    return Math.min(credits.srt_credits, 10);
  };

  const startTest = async () => {
    const maxSituations = getMaxAllowedSituations();
    if (practiceCount > maxSituations) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxSituations} situations with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    setShowCountSelector(false);
    const fetchedSituations = await fetchSituations();
    if (fetchedSituations.length > 0) {
      const totalTime = practiceCount * 15; // 15 seconds per situation
      updateTestState({
        hasStarted: true,
        practiceCount,
        currentIndex: 0,
        completedCount: 0,
        responses: [],
        response: ''
      });
      setTestInProgress(true);
      setTotalTimeLeft(totalTime);
      setIsActive(true);
      setIsPaused(false);

      // Enter fullscreen mode
      if (isSupported) {
        await enterFullscreen();
      }

      toast({
        title: 'SRT Practice Started!',
        description: `Get ready to respond to ${practiceCount} situations.`,
      });
    }
  };

  const finishEarlyTest = async () => {
    updateTestState({
      completedCount: practiceCount  // Mark as complete
    });
    setTestInProgress(false);
    setIsActive(false);
    setIsPaused(false);
    
    // Exit fullscreen
    if (isFullscreen && isSupported) {
      await exitFullscreen();
    }
    
    toast({
      title: 'Test Finished Early',
      description: `You completed ${responses.length} out of ${practiceCount} situations.`,
    });
  };

  const skipCurrentSituation = () => {
    handleNextSituation();
  };

  const preventNavigation = (e: BeforeUnloadEvent) => {
    if (testInProgress) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', preventNavigation);
    return () => window.removeEventListener('beforeunload', preventNavigation);
  }, [testInProgress]);

  const handleNextSituation = async () => {
    if (!user || !situations[currentIndex]) return;

      setLoading(true);
      try {
        // Save current response (no image upload per question anymore)
        const { data: savedResponse, error } = await supabase
          .from('test_responses')
          .insert({
            user_id: user.id,
            test_type: 'srt',
            response_text: response,
            image_id: situations[currentIndex].id,
            session_id: sessionId,
            time_taken: Math.max(0, (practiceCount * 15) - totalTimeLeft)
          })
          .select()
          .single();

      if (error) throw error;
      
      // Track the response
      const newResponses = [...responses, savedResponse];
      const newCompletedCount = completedCount + 1;

      if (newCompletedCount < practiceCount && currentIndex < situations.length - 1) {
        // Move to next situation
        updateTestState({
          currentIndex: currentIndex + 1,
          completedCount: newCompletedCount,
           responses: newResponses,
           response: ''
         });
         setUploadedImage(null);
      } else {
        // All situations completed
        updateTestState({
          completedCount: newCompletedCount,
          responses: newResponses
        });
        setTestInProgress(false);
        setIsActive(false);
        toast({
          title: 'SRT Practice Complete!',
          description: `You have completed all ${practiceCount} situations.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Submission Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    resetTestState();
    setShowCountSelector(true);
    setIsActive(false);
    setUploadedImage(null);
    setTotalTimeLeft(0);
    setTestInProgress(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      toast({
        title: 'Image Selected',
        description: 'Image ready for upload with your response.',
      });
    }
  };

  const progressPercentage = practiceCount > 0 ? (responses.length / practiceCount) * 100 : 0;
  const currentSituation = situations[currentIndex];
  const totalTestTime = practiceCount * 15 * 60;
  const timeProgress = totalTestTime > 0 ? ((totalTestTime - totalTimeLeft) / totalTestTime) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Situation Reaction Test (SRT)
        </h1>
        <p className="text-muted-foreground">
          Read each situation carefully and provide your response within 15 seconds. You can type or upload a handwritten response.
        </p>
      </div>

      {showCountSelector ? (
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-primary rounded-2xl">
                <Target className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle>How many situations would you like to practice?</CardTitle>
            <CardDescription>
              Select the number of SRT situations you want to practice with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="practiceCount">Number of Situations</Label>
              <Input
                id="practiceCount"
                type="number"
                min="1"
                max={getMaxAllowedSituations()}
                value={practiceCount}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(getMaxAllowedSituations(), parseInt(e.target.value) || 1));
                  updateTestState({ practiceCount: value });
                }}
                className="w-32 text-center"
              />
              <p className="text-xs text-muted-foreground">
                Max: {getMaxAllowedSituations()} situations {!hasActivePlan() && '(based on your credits)'}
              </p>
            </div>
            <Button onClick={checkCreditsAndStart} size="lg" className="shadow-command" disabled={starting}>
              <Play className="w-4 h-4 mr-2" />
              {starting ? 'Starting…' : `Start SRT Practice (${practiceCount} situations)`}
            </Button>
          </CardContent>
        </Card>
      ) : !hasStarted ? (
        <Card className="text-center">
          <CardContent className="p-8">
            <p className="text-muted-foreground">Loading situations...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Test Controls with Timer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="font-mono text-lg font-bold">{formatTime(totalTimeLeft)}</span>
                    <span className="text-muted-foreground text-sm">
                      {currentIndex + 1}/{practiceCount}
                    </span>
                  </div>
                  {isPaused && (
                    <span className="text-sm text-amber-500 font-medium">PAUSED</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isSupported && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipCurrentSituation}
                    disabled={!isActive || completedCount >= practiceCount}
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button
                         variant="destructive"
                         size="sm"
                         disabled={!testInProgress}
                       >
                         <Square className="w-4 h-4 mr-2" />
                         Finish Early
                       </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Finish Test Early?</AlertDialogTitle>
                         <AlertDialogDescription>
                           Are you sure you want to finish the test early? You will be evaluated based on the {completedCount} situations you have completed so far.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                         <AlertDialogAction onClick={finishEarlyTest}>
                           Yes, Finish Test
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Prep/Resume */}
          {hasStarted && completedCount < practiceCount && (!isActive || situations.length === 0) && (
            <Card className="text-center">
              <CardContent className="p-8">
                <p className="text-muted-foreground mb-4">
                  {situations.length === 0 ? 'Preparing your first situation...' : 'Timer paused.'}
                </p>
                {!isActive && (
                  <Button variant="outline" onClick={() => { setIsActive(true); }}>
                    Resume
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Situation */}
          {currentSituation && completedCount < practiceCount && (
            <Card>
              <CardHeader>
                <CardTitle>Situation {currentIndex + 1}</CardTitle>
                <CardDescription>
                  Read the situation below and provide your response.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-foreground leading-relaxed">
                    {currentSituation.situation_text}
                  </p>
                </div>

                   <div className="space-y-4">
                     <div>
                       <Label htmlFor="response">Your Response</Label>
                       <Textarea
                         id="response"
                         placeholder="What would you do in this situation? Provide a clear and practical response..."
                         value={response}
                         onChange={(e) => updateTestState({ response: e.target.value })}
                         className="min-h-[120px]"
                         disabled={totalTimeLeft === 0}
                       />
                     </div>

                   <div className="flex justify-between items-center">
                     <p className="text-sm text-muted-foreground">
                       Characters: {response.length} | Words: {response.split(' ').filter(word => word.length > 0).length}
                     </p>
                     <Button 
                       onClick={handleNextSituation}
                       disabled={!response.trim() || loading}
                       className="shadow-command"
                     >
                       <Send className="w-4 h-4 mr-2" />
                       {loading ? 'Submitting...' : 
                        currentIndex < situations.length - 1 ? 'Next Situation' : 'Finish'}
                     </Button>
                   </div>
                   </div>
              </CardContent>
            </Card>
          )}

          {/* Test Complete */}
          {completedCount >= practiceCount && (
            <Card>
              <CardHeader>
                <CardTitle>SRT Practice Complete!</CardTitle>
                <CardDescription>
                  You have successfully completed all {practiceCount} situations. Upload an image if you have handwritten responses, then get your evaluation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enhanced Image Upload Section */}
                <div className="border-t pt-4">
                  <TestImageUpload
                    onFilesUploaded={(files) => {
                      if (files.length > 0) {
                        setUploadedImage(files[0]);
                      }
                    }}
                    sessionId={sessionId}
                    testType="srt"
                    maxFiles={3}
                    currentUploadedImage={uploadedImage}
                    onImageChange={setUploadedImage}
                  />
                </div>

                {evaluationError && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{evaluationError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEvaluationError(null)}
                      className="mt-2"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}

                 <div className="flex gap-3">
                    <Button 
                      onClick={async () => {
                        try {
                          setEvaluationLoading(true);
                          setEvaluationError(null);
                          
                          console.log('Processing evaluation for:', { userId: user?.id, testType: 'srt', responseCount: responses.length });
                          
                          let finalImageUrl = null;
                          if (uploadedImage) {
                            console.log('Uploading final image...');
                            finalImageUrl = await uploadImage(uploadedImage);
                            console.log('Final image uploaded:', finalImageUrl);
                          }

                          const responseIds = responses.map(r => r.id);
                          console.log('Calling OpenAI evaluation with:', { userId: user?.id, testType: 'srt', responseIds, finalImageUrl });
                          
                          const { data, error } = await supabase.functions.invoke('openai-evaluation', {
                            body: {
                              userId: user?.id,
                              testType: 'srt',
                              responseIds,
                              finalImageUrl
                            }
                          });
                          
                          console.log('Evaluation response:', { data, error });
                          
                          if (error) {
                            console.error('Supabase function error:', error);
                            throw error;
                          }
                          
                          toast({
                            title: "Evaluation Complete!",
                            description: "Your SRT test has been evaluated successfully.",
                          });
                          
                          setTimeout(() => {
                            window.location.href = '/results';
                          }, 1500);
                        } catch (error: any) {
                          console.error('Evaluation error:', error);
                          setEvaluationError(error.message || 'Failed to get evaluation. Please try again.');
                          toast({
                            title: "Error",
                            description: error.message || "Failed to get evaluation. Please try again.",
                            variant: "destructive",
                          });
                          } finally {
                            setEvaluationLoading(false);
                         }
                      }}
                      className="shadow-command flex-1"
                      disabled={evaluationLoading}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Test & Get Evaluation
                    </Button>
                   <Button 
                     variant="outline"
                     onClick={resetTest}
                   >
                     Practice Again
                   </Button>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Evaluation Loading Modal */}
      <EvaluationLoading 
        isOpen={evaluationLoading} 
        message="Analyzing your SRT responses... Please wait while AI evaluates your test."
      />
      
      {/* Credit Popup */}
      <CreditPopup
        isOpen={showCreditPopup}
        onClose={() => setShowCreditPopup(false)}
        testType="srt"
        creditsLeft={credits?.srt_credits || 0}
      />
    </div>
  );
};

export default SRT;