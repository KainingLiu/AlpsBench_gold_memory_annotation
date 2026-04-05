import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import type { SessionData, GoldenMemory, AnnotatedSession } from './types';
import { DialoguePanel } from './components/DialoguePanel';
import { GoldenEditor } from './components/GoldenEditor';
import type { GoldenEditorHandle } from './components/GoldenEditor';
import { LlmReferencePanel } from './components/LlmReferencePanel';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import type { LlmMemoryItem } from './types';

const STORAGE_KEY = 'golden-memory-annotations-v1';

function loadAnnotations(): Record<string, AnnotatedSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAnnotations(data: Record<string, AnnotatedSession>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function App() {
  const [sessionKeys, setSessionKeys] = useState<string[]>([]);
  const [fileIndex, setFileIndex] = useState<Map<string, File>>(new Map());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentData, setCurrentData] = useState<SessionData | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, AnnotatedSession>>(loadAnnotations);
  const [loading, setLoading] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goldenPanelRef = useRef<HTMLDivElement>(null);
  const dialoguePanelRef = useRef<HTMLDivElement>(null);
  const goldenEditorRef = useRef<GoldenEditorHandle>(null);
  const currentKey = sessionKeys[currentIdx] || '';

  // Cross-panel scroll: dialogue → memory
  const scrollToMemoryByUtterance = useCallback((utteranceIdx: number) => {
    if (!goldenPanelRef.current) return;
    const cards = goldenPanelRef.current.querySelectorAll('[data-evidence-utterance]');
    for (const card of Array.from(cards)) {
      if (card.getAttribute('data-evidence-utterance') === String(utteranceIdx)) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-blue-400');
        setTimeout(() => card.classList.remove('ring-2', 'ring-blue-400'), 1500);
        return;
      }
    }
    toast('中栏没有引用该对话的 memory');
  }, []);

  // Cross-panel scroll: memory → dialogue
  const scrollToDialogue = useCallback((utteranceIdx: number) => {
    if (!dialoguePanelRef.current) return;
    const el = dialoguePanelRef.current.querySelector(`[data-utterance="${utteranceIdx}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-green-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-green-400'), 1500);
    }
  }, []);

  // Persist annotations on change
  useEffect(() => {
    saveAnnotations(annotations);
  }, [annotations]);

  // Handle folder upload
  const handleFolderUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setLoading(true);

    const index = new Map<string, File>();
    const keys: string[] = [];

    for (const file of Array.from(files)) {
      const rel = file.webkitRelativePath || file.name;
      index.set(rel, file);
    }

    for (const rel of index.keys()) {
      const match = rel.match(/\/(sess_[^/]+)\/all_llm_memories\.json$/);
      if (match) keys.push(match[1]);
    }

    keys.sort();
    setFileIndex(index);
    setSessionKeys(keys);
    setCurrentIdx(0);
    setLoading(false);
    toast.success(`已加载 ${keys.length} 个 session`);
  }, []);

  // Load current session data
  useEffect(() => {
    if (!currentKey || fileIndex.size === 0) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      let targetFile: File | undefined;
      for (const [rel, file] of fileIndex.entries()) {
        if (rel.includes(currentKey) && rel.endsWith('all_llm_memories.json')) {
          targetFile = file;
          break;
        }
      }
      if (!targetFile || cancelled) { setLoading(false); return; }

      try {
        const text = await targetFile.text();
        const data: SessionData = JSON.parse(text);
        if (!cancelled) setCurrentData(data);
      } catch (err) {
        toast.error('解析 JSON 失败: ' + (err as Error).message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentKey, fileIndex]);

  // Get current golden (from annotation or original data)
  const currentAnnotation = annotations[currentKey];
  const currentGolden: GoldenMemory[] = currentAnnotation
    ? currentAnnotation.golden_answer
    : currentData?.golden_answer || [];

  const handleSaveGolden = useCallback((golden: GoldenMemory[]) => {
    setAnnotations(prev => ({
      ...prev,
      [currentKey]: {
        sessionKey: currentKey,
        golden_answer: golden,
        status: 'done',
        updatedAt: new Date().toISOString(),
      },
    }));
    toast.success('已保存');
  }, [currentKey]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(annotations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden-annotations-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出标注结果');
  }, [annotations]);

  const handleExportMerged = useCallback(async () => {
    const results: Record<string, { session_id: string; canonical_id: string; golden_answer: GoldenMemory[] }> = {};
    for (const [key, ann] of Object.entries(annotations)) {
      if (ann.status !== 'done') continue;
      const match = key.match(/^(sess_[a-f0-9]+)__(\d+)$/);
      results[key] = {
        session_id: match ? match[1] : key,
        canonical_id: match ? match[2] : '',
        golden_answer: ann.golden_answer,
      };
    }
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden-merged-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${Object.keys(results).length} 条已完成的标注`);
  }, [annotations]);

  // Add LLM item directly into the editor's local state — no annotations update,
  // so currentGolden doesn't change and the editor doesn't reset.
  const handleAddFromLlm = useCallback((item: LlmMemoryItem) => {
    if (!goldenEditorRef.current) return;
    const newMemory: Omit<GoldenMemory, 'memory_id'> = {
      type: (item.type === 'direct' || item.type === 'indirect') ? item.type : 'direct',
      label: item.label || '',
      label_suggestion: item.label_suggestion ?? null,
      value: item.value || '',
      reasoning: '',
      evidence: {
        session_id: currentData?.session_id || '',
        utterance_index: 0,
        text: item.evidence_text || '',
      },
      confidence: item.confidence ?? 0.8,
      time_scope: 'unknown',
      emotion: null,
      preference_attitude: null,
      updated_at: new Date().toISOString(),
    };
    goldenEditorRef.current.addExternalItem(newMemory);
    toast.success(`已添加: ${item.value.slice(0, 40)}...`);
  }, [currentData]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Record<string, AnnotatedSession>;
        setAnnotations(prev => ({ ...prev, ...imported }));
        toast.success(`已导入 ${Object.keys(imported).length} 条标注`);
      } catch { toast.error('导入失败'); }
    };
    input.click();
  }, []);

  // Navigation
  const goPrev = () => setCurrentIdx(i => Math.max(0, i - 1));
  const goNext = () => setCurrentIdx(i => Math.min(sessionKeys.length - 1, i + 1));
  const handleJump = () => {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= sessionKeys.length) {
      setCurrentIdx(n - 1);
      setJumpInput('');
    }
  };

  // Stats
  const doneCount = sessionKeys.filter(k => annotations[k]?.status === 'done').length;
  const inProgressCount = sessionKeys.filter(k => annotations[k]?.status === 'in_progress').length;
  const progress = sessionKeys.length > 0 ? (doneCount / sessionKeys.length) * 100 : 0;
  const currentStatus = annotations[currentKey]?.status || 'pending';

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft' || e.key === 'a') goPrev();
      if (e.key === 'ArrowRight' || e.key === 'd') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sessionKeys.length]);

  // No data loaded yet — show upload screen
  if (sessionKeys.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="text-center space-y-6 max-w-lg">
          <h1 className="text-2xl font-semibold">Golden Memory 标注工具</h1>
          <p className="text-muted-foreground">
            请上传 split_1 文件夹（包含 sess_xxx 子文件夹）
          </p>
          <div className="space-y-3">
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              选择文件夹
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              {...{ webkitdirectory: '', directory: '', multiple: true } as any}
              onChange={handleFolderUpload}
            />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleImport}>
                导入已有标注
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center gap-4 bg-card shrink-0">
        <h1 className="text-lg font-semibold whitespace-nowrap">Golden Memory 标注</h1>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIdx === 0}>
            上一个
          </Button>
          <span className="text-sm tabular-nums min-w-[80px] text-center">
            {currentIdx + 1} / {sessionKeys.length}
          </span>
          <Button variant="outline" size="sm" onClick={goNext} disabled={currentIdx >= sessionKeys.length - 1}>
            下一个
          </Button>
          <input
            className="w-16 border rounded px-2 py-1 text-sm"
            placeholder="跳转"
            value={jumpInput}
            onChange={e => setJumpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJump()}
          />
          <Button variant="ghost" size="sm" onClick={handleJump}>Go</Button>
        </div>

        {/* Status badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          currentStatus === 'done' ? 'bg-green-100 text-green-800' :
          currentStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {currentStatus === 'done' ? '已完成' : currentStatus === 'in_progress' ? '进行中' : '未开始'}
        </span>

        <div className="flex-1" />

        {/* Progress */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {doneCount}完成 / {inProgressCount}进行中 / {sessionKeys.length}总计
          </span>
        </div>

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={handleExport}>导出标注</Button>
        <Button variant="outline" size="sm" onClick={handleExportMerged}>导出结果</Button>
        <Button variant="outline" size="sm" onClick={handleImport}>导入</Button>
      </header>

      {/* Session info bar */}
      <div className="px-4 py-1.5 bg-muted/50 border-b text-sm flex items-center gap-4">
        <span className="font-mono text-xs">{currentKey}</span>
        {currentData && (
          <>
            <span className="text-muted-foreground">|</span>
            <span>Stratum: <strong>{currentData.stratum}</strong></span>
            <span className="text-muted-foreground">|</span>
            <span>对话轮数: <strong>{currentData.dialogue.length}</strong></span>
            <span className="text-muted-foreground">|</span>
            <span>原始 Golden: <strong>{currentData.golden_answer.length}</strong> 条</span>
            <span className="text-muted-foreground">|</span>
            <span>模型数: <strong>{currentData.llm_outputs ? Object.keys(currentData.llm_outputs).length : 0}</strong></span>
          </>
        )}
      </div>

      {/* Main content: resizable 3-column, each independently scrollable */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">加载中...</div>
      ) : currentData ? (
        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          {/* Left: Dialogue */}
          <ResizablePanel defaultSize={35} minSize={15} id="dialogue">
            <div ref={dialoguePanelRef} className="h-full overflow-y-auto p-4">
              <DialoguePanel
                dialogue={currentData.dialogue}
                onLocateMemory={scrollToMemoryByUtterance}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: Golden Editor */}
          <ResizablePanel defaultSize={40} minSize={20} id="golden">
            <div ref={goldenPanelRef} className="h-full overflow-y-auto p-4">
              <GoldenEditor
                key={currentKey}
                ref={goldenEditorRef}
                golden={currentGolden}
                sessionId={currentData.session_id}
                dialogue={currentData.dialogue}
                onSave={handleSaveGolden}
                scrollContainerRef={goldenPanelRef}
                onLocateDialogue={scrollToDialogue}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: LLM Reference */}
          <ResizablePanel defaultSize={25} minSize={10} id="llm">
            <div className="h-full overflow-y-auto p-4">
              <LlmReferencePanel llmOutputs={currentData.llm_outputs} onAddToGolden={handleAddFromLlm} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">无数据</div>
      )}
    </div>
  );
}
