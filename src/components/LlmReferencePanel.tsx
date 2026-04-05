import { useState } from 'react';
import type { LlmOutput, LlmMemoryItem } from '../types';
import { Button } from './ui/button';

interface Props {
  llmOutputs: Record<string, LlmOutput>;
  onAddToGolden?: (item: LlmMemoryItem) => void;
}

export function LlmReferencePanel({ llmOutputs, onAddToGolden }: Props) {
  const models = Object.keys(llmOutputs || {});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());

  const toggle = (model: string) => {
    setExpanded(prev => ({ ...prev, [model]: !prev[model] }));
  };

  const handleAdd = (model: string, idx: number, item: LlmMemoryItem) => {
    const key = `${model}::${idx}`;
    if (added.has(key)) return;
    setAdded(prev => new Set(prev).add(key));
    onAddToGolden?.(item);
  };

  if (models.length === 0) {
    return <p className="text-sm text-muted-foreground">无模型输出</p>;
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-3 sticky top-0 bg-background py-1">
        模型参考 ({models.length} 个模型)
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        仅供参考，不要按模型结果标注。确认合理的可点「加入」
      </p>
      <div className="space-y-2">
        {models.map(model => {
          const output = llmOutputs[model];
          const items = output.memory_items || [];
          const isOpen = expanded[model];

          return (
            <div key={model} className="border rounded-lg">
              <button
                className="w-full text-left px-3 py-2 text-sm font-medium flex items-center justify-between hover:bg-muted/50"
                onClick={() => toggle(model)}
              >
                <span className="truncate">{model}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {items.length} 条 {isOpen ? '▼' : '▶'}
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {items.map((item, i) => {
                    const key = `${model}::${i}`;
                    const isAdded = added.has(key);
                    return (
                      <div key={i} className={`rounded p-2 text-xs space-y-1 ${isAdded ? 'bg-green-50 border border-green-200' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                            {item.type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium truncate">
                            {item.label}
                          </span>
                          <span className="text-muted-foreground ml-auto shrink-0">
                            conf: {item.confidence}
                          </span>
                        </div>
                        <p className="font-medium">{item.value}</p>
                        {item.evidence_text && (
                          <p className="text-muted-foreground italic">
                            证据: "{item.evidence_text}"
                          </p>
                        )}
                        {onAddToGolden && (
                          <Button
                            variant={isAdded ? 'ghost' : 'outline'}
                            size="sm"
                            className={`mt-1 h-6 text-xs ${isAdded ? 'text-green-600' : ''}`}
                            disabled={isAdded}
                            onClick={() => handleAdd(model, i, item)}
                          >
                            {isAdded ? '已加入' : '加入 Golden'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground">该模型无提取结果</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
