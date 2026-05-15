'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSREStore } from '@/lib/store';
import { analyzeLogStream, getHistory, uploadFile, API_BASE } from '@/lib/api';
import type { AnalysisResult, ChatMessage, StreamProgress } from '@/types';

import TopNavbar from '@/components/TopNavbar';
import LeftPanel from '@/components/LeftPanel';
import CenterPanel from '@/components/CenterPanel';
import RightPanel from '@/components/RightPanel';

export default function SRECopilot() {
  const store = useSREStore();
  const abortRef = useRef<AbortController | null>(null);

  /* ── Load History on Mount ── */
  const loadHistory = useCallback(async () => {
    try {
      const items = await getHistory();
      store.setHistory(items);
    } catch {
      store.setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  /* ── Analysis Submit Handler ── */
  const handleAnalyze = useCallback(async (inputText?: string) => {
    const text = inputText || store.logInput.trim();
    if (!text || store.isAnalyzing) return;

    // Check cache first
    const cacheKey = text.slice(0, 200);
    const cached = store.getCachedAnalysis(cacheKey);
    if (cached) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text.length > 500 ? text.slice(0, 500) + '...' : text,
        timestamp: new Date(),
      };
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `## 🔍 ${cached.detected_issue}\n\n**Root Cause:** ${cached.root_cause}\n\n_Loaded from cache_`,
        timestamp: new Date(),
        analysis: cached,
      };
      store.addMessage(userMsg);
      store.addMessage(assistantMsg);
      store.setLastAnalysis(cached);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.length > 500 ? text.slice(0, 500) + '...' : text,
      timestamp: new Date(),
    };

    store.addMessage(userMsg);
    store.setLogInput('');
    store.setIsAnalyzing(true);
    store.setStreamSteps([]);
    store.setCurrentStep(0);

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    store.addMessage(assistantMsg);

    let finalResult: AnalysisResult | null = null;
    let llmContent = '';

    try {
      for await (const event of analyzeLogStream(
        text,
        store.metricsInput || undefined,
        store.tracesInput || undefined,
      )) {
        if (event.type === 'progress') {
          store.setCurrentStep(event.step);
          const current = useSREStore.getState().streamSteps;
          store.setStreamSteps([
            ...current.filter((s) => s.step !== event.step),
            { step: event.step, title: event.title, status: 'running' },
          ]);
        } else if (event.type === 'step_complete') {
          const currentSteps = useSREStore.getState().streamSteps;
          store.setStreamSteps(
            currentSteps.map((s) =>
              s.step === event.step ? { ...s, title: event.title, status: 'complete' as const } : s,
            ),
          );
        } else if (event.type === 'llm_chunk' && event.content) {
          llmContent += event.content;
          store.updateMessage(assistantId, { content: llmContent });
        } else if (event.type === 'analysis_complete' && event.result) {
          finalResult = event.result;
        }
      }
    } catch (err) {
      llmContent = `Analysis failed: ${
        err instanceof Error ? err.message : 'Connection error'
      }. Ensure the backend is running on http://localhost:8000`;
    }

    store.updateMessage(assistantId, {
      content: llmContent || 'Analysis complete.',
      analysis: finalResult || undefined,
      isStreaming: false,
    });

    if (finalResult) {
      store.setLastAnalysis(finalResult);
      store.cacheAnalysis(cacheKey, finalResult);
    }

    store.setIsAnalyzing(false);
    store.setStreamSteps([]);
    store.setCurrentStep(0);
    void loadHistory();
  }, [store, loadHistory]);

  /* ── File Upload Handler ── */
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const result = await uploadFile(file);
      const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📁 **File uploaded:** ${result.filename}\n\n${result.message}\n\n${result.document_count} chunks indexed and ready for retrieval.`,
        timestamp: new Date(),
      };
      store.addMessage(sysMsg);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      store.addMessage(errMsg);
    }
  }, [store]);

  /* ── Follow-up Handler ── */
  const handleFollowUp = useCallback(async (question: string) => {
    if (!question.trim()) return;
    store.setFollowUpInput('');
    await handleAnalyze(question);
  }, [handleAnalyze, store]);

  /* ── Report Generation ── */
  const handleGenerateReport = useCallback(async (analysis: AnalysisResult) => {
    try {
      const response = await fetch(`${API_BASE}/api/analyze/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postmortem_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF report');
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* ═══ TOP NAVBAR ═══ */}
      <TopNavbar />

      {/* ═══ 3-PANEL WORKSPACE ═══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL — Input */}
        {store.leftPanelOpen && (
          <LeftPanel
            onAnalyze={handleAnalyze}
            onFileUpload={handleFileUpload}
          />
        )}

        {/* CENTER PANEL — AI Output */}
        <CenterPanel
          onAnalyze={handleAnalyze}
          onFollowUp={handleFollowUp}
          onGenerateReport={handleGenerateReport}
        />

        {/* RIGHT PANEL — System Context */}
        {store.rightPanelOpen && <RightPanel />}
      </div>
    </div>
  );
}
