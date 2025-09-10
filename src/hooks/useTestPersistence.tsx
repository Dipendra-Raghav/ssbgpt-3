import { useState, useEffect } from 'react';

interface TestState {
  hasStarted: boolean;
  currentIndex: number;
  completedCount: number;
  responses: any[];
  practiceCount: number;
  sessionId: string;
  // Test-specific states
  sentence?: string;
  response?: string;
  story?: string;
  uploadedImage?: File | null;
}

export const useTestPersistence = (testType: string, defaultState: TestState) => {
  const storageKey = `${testType}_test_state`;
  
  const [testState, setTestState] = useState<TestState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Don't restore uploadedImage as File objects can't be serialized
        return { ...parsedState, uploadedImage: null };
      }
    } catch (error) {
      console.error('Failed to parse saved test state:', error);
    }
    return defaultState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      // Create a serializable version of the state (excluding File objects)
      const serializableState = {
        ...testState,
        uploadedImage: null // Don't serialize File objects
      };
      localStorage.setItem(storageKey, JSON.stringify(serializableState));
    } catch (error) {
      console.error('Failed to save test state:', error);
    }
  }, [testState, storageKey]);

  const updateTestState = (updates: Partial<TestState>) => {
    setTestState(prev => ({ ...prev, ...updates }));
  };

  const resetTestState = () => {
    localStorage.removeItem(storageKey);
    setTestState(defaultState);
  };

  return {
    testState,
    updateTestState,
    resetTestState
  };
};