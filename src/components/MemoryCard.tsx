import { useState } from 'react';
import type { GoldenMemory, DialogueTurn } from '../types';
import { Button } from './ui/button';

// Common label options from the data
const LABEL_OPTIONS = [
  'Personal_Background/Identity',
  'Personal_Background/Occupation',
  'Personal_Background/Education',
  'Personal_Background/Location',
  'Personal_Background/Family',
  'Personal_Background/Health',
  'Personal_Background/Age',
  'Preferences/Interaction_Preferences',
  'Preferences/Content_Preferences',
  'Preferences/Food_Preferences',
  'Preferences/Entertainment_Preferences',
  'Preferences/Style_Preferences',
  'Thoughts/Curiosity',
  'Thoughts/Opinions/Positive',
  'Thoughts/Opinions/Negative',
  'Thoughts/Opinions/Neutral',
  'Thoughts/Goals',
  'Thoughts/Concerns',
  'Experiences/Past_Events',
  'Experiences/Current_Activities',
  'Experiences/Travel',
  'Skills/Technical',
  'Skills/Languages',
  'Skills/Creative',
  'Social/Relationships',
  'Social/Pets',
  'UNMAPPED',
];

interface Props {
  memory: GoldenMemory;
  index: number;
  dialogue: DialogueTurn[];
  onChange: (updated: GoldenMemory) => void;
  onDelete: () => void;
  onLocateDialogue?: (utteranceIdx: number) => void;
}

export function MemoryCard({ memory, index, dialogue, onChange, onDelete, onLocateDialogue }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (patch: Partial<GoldenMemory>) => {
    onChange({ ...memory, ...patch });
  };

  const updateEvidence = (patch: Partial<GoldenMemory['evidence']>) => {
    onChange({ ...memory, evidence: { ...memory.evidence, ...patch } });
  };

  // Pick evidence from dialogue
  const pickEvidence = (utteranceIdx: number) => {
    const turn = dialogue[utteranceIdx];
    if (turn) {
      updateEvidence({
        utterance_index: utteranceIdx,
        text: turn.text.slice(0, 200),
      });
    }
  };

  if (collapsed) {
    return (
      <div className="border rounded-lg p-3 bg-card cursor-pointer hover:bg-muted/30"
        onClick={() => setCollapsed(false)}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-mono text-muted-foreground">{memory.memory_id}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            memory.type === 'direct' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>{memory.type}</span>
          <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 truncate max-w-[150px]">
            {memory.label || '(无标签)'}
          </span>
          <span className="truncate flex-1 text-muted-foreground">{memory.value || '(无内容)'}</span>
          <span className="text-xs text-muted-foreground">▶</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{memory.memory_id}</span>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)}>
            收起
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            删除
          </Button>
        </div>
      </div>

      {/* Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
          <div className="flex gap-2">
            {(['direct', 'indirect'] as const).map(t => (
              <button
                key={t}
                className={`px-3 py-1 rounded text-sm border ${
                  memory.type === t
                    ? t === 'direct' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
                onClick={() => update({ type: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Confidence</label>
          <input
            type="number"
            min={0} max={1} step={0.05}
            className="w-full border rounded px-2 py-1 text-sm"
            value={memory.confidence}
            onChange={e => update({ confidence: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Label</label>
        <div className="flex gap-2">
          <select
            className="flex-1 border rounded px-2 py-1 text-sm"
            value={LABEL_OPTIONS.includes(memory.label) ? memory.label : '__custom__'}
            onChange={e => {
              if (e.target.value !== '__custom__') update({ label: e.target.value });
            }}
          >
            <option value="">-- 选择标签 --</option>
            {LABEL_OPTIONS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
            {!LABEL_OPTIONS.includes(memory.label) && memory.label && (
              <option value="__custom__">自定义: {memory.label}</option>
            )}
          </select>
          <input
            className="flex-1 border rounded px-2 py-1 text-sm"
            placeholder="或手动输入标签"
            value={memory.label}
            onChange={e => update({ label: e.target.value })}
          />
        </div>
      </div>

      {/* Label Suggestion */}
      {memory.label === 'UNMAPPED' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Label Suggestion</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="建议的标签名"
            value={memory.label_suggestion || ''}
            onChange={e => update({ label_suggestion: e.target.value || null })}
          />
        </div>
      )}

      {/* Value */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Value (记忆内容)</label>
        <textarea
          className="w-full border rounded px-2 py-1.5 text-sm min-h-[60px] resize-y"
          value={memory.value}
          onChange={e => update({ value: e.target.value })}
        />
      </div>

      {/* Reasoning */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Reasoning</label>
        <textarea
          className="w-full border rounded px-2 py-1.5 text-sm min-h-[40px] resize-y"
          value={memory.reasoning}
          onChange={e => update({ reasoning: e.target.value })}
        />
      </div>

      {/* Evidence */}
      <div className="border rounded p-3 bg-muted/20 space-y-2">
        <label className="text-xs font-medium text-muted-foreground block">Evidence (证据)</label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Utterance Index</label>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                min={0}
                max={dialogue.length - 1}
                className="w-20 border rounded px-2 py-1 text-sm"
                value={memory.evidence.utterance_index}
                onChange={e => {
                  const idx = parseInt(e.target.value, 10);
                  if (!isNaN(idx)) pickEvidence(idx);
                }}
              />
              <span className="text-xs text-muted-foreground">
                (0-{dialogue.length - 1})
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => pickEvidence(memory.evidence.utterance_index)}>
            自动填充文本
          </Button>
          {onLocateDialogue && (
            <Button variant="outline" size="sm" onClick={() => onLocateDialogue(memory.evidence.utterance_index)}>
              定位对话
            </Button>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Evidence Text</label>
          <textarea
            className="w-full border rounded px-2 py-1.5 text-sm min-h-[40px] resize-y"
            value={memory.evidence.text}
            onChange={e => updateEvidence({ text: e.target.value })}
          />
        </div>
        {/* Quick pick: show user utterances */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            快速选择 User 发言
          </summary>
          <div className="mt-1 max-h-[150px] overflow-y-auto space-y-1">
            {dialogue.map((turn, i) => turn.role === 'user' ? (
              <button
                key={i}
                className="block w-full text-left px-2 py-1 rounded hover:bg-blue-50 truncate"
                onClick={() => pickEvidence(i)}
              >
                <span className="font-mono text-muted-foreground">#{i}</span>{' '}
                {turn.text.slice(0, 100)}
              </button>
            ) : null)}
          </div>
        </details>
      </div>

      {/* Time scope */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Time Scope</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={memory.time_scope}
            onChange={e => update({ time_scope: e.target.value })}
          >
            <option value="unknown">unknown</option>
            <option value="long_term">long_term</option>
            <option value="short_term">short_term</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Emotion</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="null"
            value={memory.emotion || ''}
            onChange={e => update({ emotion: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Preference/Attitude</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="null"
            value={memory.preference_attitude || ''}
            onChange={e => update({ preference_attitude: e.target.value || null })}
          />
        </div>
      </div>
    </div>
  );
}
