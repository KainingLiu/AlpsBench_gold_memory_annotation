import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { GoldenMemory, DialogueTurn } from '../types';
import { Button } from './ui/button';
import { MemoryCard } from './MemoryCard';

export interface GoldenEditorHandle {
  addExternalItem: (item: Omit<GoldenMemory, 'memory_id'>) => void;
}

interface Props {
  golden: GoldenMemory[];
  sessionId: string;
  dialogue: DialogueTurn[];
  onSave: (golden: GoldenMemory[]) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onLocateDialogue?: (utteranceIdx: number) => void;
}

function makeEmptyMemory(sessionId: string, nextId: number): GoldenMemory {
  return {
    memory_id: `m${nextId}`,
    type: 'direct',
    label: '',
    label_suggestion: null,
    value: '',
    reasoning: '',
    evidence: { session_id: sessionId, utterance_index: 0, text: '' },
    confidence: 0.8,
    time_scope: 'unknown',
    emotion: null,
    preference_attitude: null,
    updated_at: new Date().toISOString(),
  };
}

export const GoldenEditor = forwardRef<GoldenEditorHandle, Props>(function GoldenEditor({
  golden, sessionId, dialogue, onSave,
  scrollContainerRef, onLocateDialogue,
}, ref) {
  const [items, setItems] = useState<GoldenMemory[]>([]);
  const [dirty, setDirty] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Only reset when golden prop changes AND user has no unsaved edits.
  // This prevents LLM-panel additions or other parent re-renders from wiping in-progress work.
  useEffect(() => {
    if (dirty) return;
    setItems(JSON.parse(JSON.stringify(golden)));
  }, [golden]);  // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else if (scrollContainerRef?.current) {
        const el = scrollContainerRef.current;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    });
  };

  // Expose addExternalItem so the parent can inject LLM suggestions directly into
  // local state — bypassing the annotations → golden prop → useEffect reset chain.
  useImperativeHandle(ref, () => ({
    addExternalItem(item: Omit<GoldenMemory, 'memory_id'>) {
      setItems(prev => {
        const maxId = prev.reduce((max, m) => {
          const n = parseInt(m.memory_id.replace(/\D/g, ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        return [...prev, { ...item, memory_id: `m${maxId + 1}` }];
      });
      setDirty(true);
      setTimeout(scrollToBottom, 50);
    },
  }));

  const updateItem = (index: number, updated: GoldenMemory) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addItem = () => {
    setItems(prev => {
      const maxId = prev.reduce((max, m) => {
        const n = parseInt(m.memory_id.replace(/\D/g, ''), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      return [...prev, makeEmptyMemory(sessionId, maxId + 1)];
    });
    setDirty(true);
    setTimeout(scrollToBottom, 50);
  };

  const handleSave = () => {
    const renumbered = items.map((m, i) => ({
      ...m,
      memory_id: `m${i + 1}`,
      updated_at: new Date().toISOString(),
    }));
    setItems(renumbered);
    onSave(renumbered);
    setDirty(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-background py-1 z-10">
        <h2 className="text-base font-semibold">
          Golden Memories ({items.length} 条)
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            + 新增
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty && items.length === golden.length}>
            保存
          </Button>
        </div>
      </div>

      {dirty && (
        <p className="text-xs text-yellow-600 mb-2">有未保存的修改</p>
      )}

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.memory_id + '-' + index} data-evidence-utterance={item.evidence.utterance_index} className="transition-all">
            <MemoryCard
              memory={item}
              index={index}
              dialogue={dialogue}
              onChange={(updated) => updateItem(index, updated)}
              onDelete={() => deleteItem(index)}
              onLocateDialogue={onLocateDialogue}
            />
          </div>
        ))}
      </div>

      <div ref={bottomRef} className="h-1" />

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>暂无 Golden Memory</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
            添加第一条
          </Button>
        </div>
      )}
    </div>
  );
});
