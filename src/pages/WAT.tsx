import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Zap, 
  Timer, 
  Send, 
  Play, 
  Camera, 
  FileImage, 
  SkipForward, 
  Square, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
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

interface WATWord {
  id: string;
  word: string;
  difficulty_level: string;
}

const WAT = () => {
  const { user } = useAuth();
  const { credits, fetchCredits, consumeCredit } = useCredits();
  const { hasActivePlan } = useSubscription();
  const [words, setWords] = useState<WATWord[]>([]);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds per word
  const [isActive, setIsActive] = useState(false);
  const [showCountSelector, setShowCountSelector] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [testInProgress, setTestInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const { isFullscreen, enterFullscreen, exitFullscreen, isSupported } = useFullscreen();

  // Use persistence hook
  const { testState, updateTestState, resetTestState } = useTestPersistence('wat', {
    hasStarted: false,
    currentIndex: 0,
    completedCount: 0,
    responses: [],
    practiceCount: 10,
    sessionId: crypto.randomUUID(),
    sentence: ''
  });

  const { hasStarted, currentIndex, completedCount, responses, practiceCount, sessionId, sentence } = testState;

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
      if (words.length === 0) {
        await fetchWords();
      }
      const isComplete = completedCount >= practiceCount;
      if (!isActive && !isComplete) {
        setIsActive(true);
        setTimeLeft(15);
      }
    };
    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  // Fetch WAT words
  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('wat_words')
        .select('*')
        .limit(practiceCount);

      if (error) throw error;
      setWords(data || []);
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load WAT words. Please try again.',
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
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Timer effect with pause support
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0 && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            // Auto-skip when time runs out
            skipCurrentWord();
            return 15;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, isPaused]);

  // Fullscreen exit handler - pause test
  useEffect(() => {
    if (testInProgress && !isFullscreen && isSupported) {
      setIsPaused(true);
      setIsActive(false);
      toast({
        title: 'Test Paused',
        description: 'Test paused due to exiting fullscreen mode.',
        variant: 'default',
      });
    }
  }, [isFullscreen, testInProgress, isSupported]);

  const getMaxAllowedWords = () => {
    if (hasActivePlan()) return 30; // Premium users can select up to 30
    if (!credits) return 1;
    
    // Free users limited by their remaining credits
    return Math.min(credits.wat_credits, 10);
  };

  const startTest = async () => {
    const maxWords = getMaxAllowedWords();
    if (practiceCount > maxWords) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxWords} words with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    if (practiceCount <= 0) {
      toast({
        title: 'Invalid Count',
        description: 'Please select a valid number of words.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const fetchedWords = await fetchWords();
    
    if (fetchedWords.length === 0) {
      setLoading(false);
      return;
    }

    updateTestState({
      hasStarted: true,
      currentIndex: 0,
      completedCount: 0,
      responses: [],
      sessionId: crypto.randomUUID(),
      sentence: ''
    });

    setShowCountSelector(false);
    setIsActive(true);
    setTestInProgress(true);
    setTimeLeft(15);
    setIsPaused(false);
    setLoading(false);

    // Enter fullscreen mode
    if (isSupported) {
      await enterFullscreen();
    }

    toast({
      title: 'WAT Practice Started!',
      description: `Get ready to create sentences for ${practiceCount} words.`,
    });
  };

  const resumeTest = async () => {
    setIsPaused(false);
    setIsActive(true);
    if (isSupported && !isFullscreen) {
      await enterFullscreen();
    }
    toast({
      title: 'Test Resumed',
      description: 'Your test has been resumed.',
    });
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
      description: `You completed ${completedCount} out of ${practiceCount} words.`,
    });
  };

  const skipCurrentWord = () => {
    if (currentIndex < words.length - 1) {
      updateTestState({
        currentIndex: currentIndex + 1,
        sentence: ''
      });
      setTimeLeft(15);
    } else {
      // Last word - finish test
      updateTestState({
        completedCount: practiceCount
      });
      setTestInProgress(false);
      setIsActive(false);
      toast({
        title: 'WAT Practice Complete!',
        description: `You have completed all ${practiceCount} words.`,
      });
    }
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

  const handleNextWord = async () => {
    if (!user || !words[currentIndex]) return;

    try {
      // Save current response
      const { data: savedResponse, error } = await supabase
        .from('test_responses')
        .insert({
          user_id: user.id,
          test_type: 'wat',
          response_text: sentence,
          image_id: words[currentIndex].id,
          session_id: sessionId
        })
        .select()
        .single();

      if (error) throw error;
      
      // Track the response
      const newResponses = [...responses, savedResponse];
      const newCompletedCount = completedCount + 1;

      if (newCompletedCount < practiceCount && currentIndex < words.length - 1) {
        // Move to next word
        updateTestState({
          currentIndex: currentIndex + 1,
          completedCount: newCompletedCount,
          responses: newResponses,
          sentence: ''
        });
        setUploadedImage(null);
        setTimeLeft(15);
      } else {
        // All words completed
        updateTestState({
          completedCount: newCompletedCount,
          responses: newResponses
        });
        setTestInProgress(false);
        setIsActive(false);
        toast({
          title: 'WAT Practice Complete!',
          description: `You have completed all ${practiceCount} words.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Submission Error',
        description: error.message,
        variant: 'destructive',
      });
    }
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && sentence.trim()) {
      handleNextWord();
    }
  };

  const checkCreditsAndStart = async () => {
    if (hasActivePlan()) {
      // Premium users can start immediately
      startTest();
      return;
    }

    // Validate requested count before consuming credits
    const maxWords = getMaxAllowedWords();
    if (practiceCount > maxWords) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxWords} words with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    if (!credits || credits.wat_credits <= 0) {
      setShowCreditPopup(true);
      return;
    }

    // Consume credit and start test
    try {
      setLoading(true);
      const result = await consumeCredit('wat');
      if (result.success) {
        await startTest();
        await fetchCredits(); // Refresh credits display
      } else {
        setShowCreditPopup(true);
      }
    } catch (error) {
      console.error('Error consuming credit:', error);
      setShowCreditPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = words[currentIndex];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Word Association Test (WAT)
        </h1>
        <p className="text-muted-foreground">
          Create a meaningful sentence using each word within 15 seconds. You can type or upload a handwritten response.
        </p>
      </div>

      {showCountSelector ? (
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-primary rounded-2xl">
                <Zap className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle>How many words would you like to practice?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="practiceCount">Number of Words</Label>
              <Input
                id="practiceCount"
                type="number"
                min="1"
                max={getMaxAllowedWords()}
                value={practiceCount}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(getMaxAllowedWords(), parseInt(e.target.value) || 1));
                  updateTestState({ practiceCount: value });
                }}
                className="w-32 text-center"
              />
              <p className="text-xs text-muted-foreground">
                Max: {getMaxAllowedWords()} words {!hasActivePlan() && '(based on your credits)'}
              </p>
            </div>
            <Button onClick={checkCreditsAndStart} size="lg" className="shadow-command" disabled={loading}>
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : `Start WAT Practice (${practiceCount} words)`}
            </Button>
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
                    <span className="font-mono text-lg font-bold">{timeLeft}s</span>
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
                      onClick={() => isFullscreen ? exitFullscreen() : enterFullscreen()}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  )}
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
                          Are you sure you want to finish the test early? You will be evaluated based on the {completedCount} words you have completed so far.
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
          {hasStarted && completedCount < practiceCount && (!isActive || words.length === 0 || isPaused) && (
            <Card className="text-center">
              <CardContent className="p-8">
                <p className="text-muted-foreground mb-4">
                  {words.length === 0 ? 'Preparing your first word...' : 
                   isPaused ? 'Test paused. Click to continue in fullscreen mode.' : 'Timer paused.'}
                </p>
                {(!isActive || isPaused) && (
                  <Button variant="outline" onClick={resumeTest}>
                    {isPaused ? 'Continue Test' : 'Resume'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Word */}
          {currentWord && isActive && !isPaused && (
            <Card>
              <CardHeader>
                <CardTitle className="text-6xl font-bold text-primary text-center mb-4">
                  {currentWord.word.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={`Create a sentence using "${currentWord.word}"...`}
                  value={sentence}
                  onChange={(e) => updateTestState({ sentence: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="text-lg"
                  autoFocus
                />

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Words: {sentence.split(' ').filter(word => word.length > 0).length}
                  </p>
                    <Button 
                      onClick={handleNextWord}
                      disabled={loading}
                      className="shadow-command"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Next Word
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Complete */}
          {!isActive && hasStarted && completedCount >= practiceCount && (
            <Card>
              <CardHeader>
                <CardTitle>WAT Practice Complete!</CardTitle>
                <CardDescription>
                  You have successfully completed all {practiceCount} words. Upload an image if you have handwritten responses, then get your evaluation.
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
                    testType="wat"
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
                        setIsEvaluating(true);
                        setEvaluationError(null);
                        
        console.log('Processing evaluation for:', { userId: user?.id, testType: 'wat', responseCount: responses.length });
        
        try {
          let finalImageUrl = null;
          if (uploadedImage) {
            if (uploadedImage.size === 0) {
              // Use the latest mobile-uploaded image URL for this session
              const { data: latest, error: suError } = await supabase
                .from('session_uploads')
                .select('public_url')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (!suError && latest?.public_url) {
                finalImageUrl = latest.public_url;
                console.log('Using mobile-uploaded image URL:', finalImageUrl);
              }
            } else {
              console.log('Uploading final image...');
              finalImageUrl = await uploadImage(uploadedImage);
              console.log('Final image uploaded:', finalImageUrl);
            }
          }

          const responseIds = responses.map(r => r.id);
          console.log('Calling OpenAI evaluation with:', { userId: user?.id, testType: 'wat', responseIds, finalImageUrl });
          
          const { data, error } = await supabase.functions.invoke('openai-evaluation', {
            body: {
              userId: user?.id,
              testType: 'wat',
              responseIds,
              finalImageUrl
            }
          });
          
          console.log('Evaluation response:', { data, error });
          
          if (error) {
            console.error('Supabase function error:', error);
            throw error;
          }
                          
                          // Clean up uploaded images
                          try {
                            await supabase.functions.invoke('delete-test-images', {
                              body: { sessionId, testType: 'wat' }
                            });
                          } catch (cleanupError) {
                            console.warn('Failed to cleanup images:', cleanupError);
                          }

                          toast({
                            title: "Evaluation Complete!",
                            description: "Your WAT test has been evaluated successfully.",
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
                          setIsEvaluating(false);
                        }
                     }}
                     className="shadow-command flex-1"
                     disabled={isEvaluating}
                   >
                     <Send className="w-4 h-4 mr-2" />
                     Submit Test & Get Evaluation
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => {
                       resetTestState();
                       setShowCountSelector(true);
                       setIsActive(false);
                       setUploadedImage(null);
                       setTimeLeft(15);
                       setTestInProgress(false);
                       setIsPaused(false);
                     }}
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
        isOpen={isEvaluating} 
        message="Analyzing your WAT responses... Please wait while AI evaluates your test."
      />
      
      {/* Credit Popup */}
      <CreditPopup
        isOpen={showCreditPopup}
        onClose={() => setShowCreditPopup(false)}
        testType="wat"
        creditsLeft={credits?.wat_credits || 0}
      />
    </div>
  );
};

export default WAT;