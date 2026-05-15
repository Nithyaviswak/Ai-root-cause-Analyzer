import { AnalysisResult, HistoryItem, StreamProgress, UploadResponse } from '@/types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function analyzeLog(logs: string, metrics?: string, traces?: string, context?: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, metrics, traces, context }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
  return res.json();
}

export async function* analyzeLogStream(
  logs: string,
  metrics?: string,
  traces?: string,
  context?: string
): AsyncGenerator<StreamProgress> {
  const res = await fetch(`${API_BASE}/api/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, metrics, traces, context }),
  });
  if (!res.ok) throw new Error(`Stream failed: ${res.statusText}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const cleaned = line.replace(/^data: /, '').trim();
      if (!cleaned || cleaned === '[DONE]') continue;
      try {
        yield JSON.parse(cleaned);
      } catch {
        // skip non-JSON
      }
    }
  }
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function getHistory(limit = 50): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/history?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  const res = await fetch(`${API_BASE}/api/history/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result || data;
}

export async function healthCheck(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}
