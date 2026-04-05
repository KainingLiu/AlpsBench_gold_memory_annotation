import { useState, useCallback } from 'react';
import type { DialogueTurn } from '../types';
import { Button } from './ui/button';

interface Props {
  dialogue: DialogueTurn[];
  onLocateMemory?: (utteranceIdx: number) => void;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data[0] as Array<[string]>).map(seg => seg[0]).join('');
  } catch {
    return '[翻译失败]';
  }
}

export function DialoguePanel({ dialogue, onLocateMemory }: Props) {
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translatingAll, setTranslatingAll] = useState(false);
  const [showTranslation, setShowTranslation] = useState<Record<number, boolean>>({});

  const translateOne = useCallback(async (index: number) => {
    if (translations[index]) {
      setShowTranslation(prev => ({ ...prev, [index]: !prev[index] }));
      return;
    }
    const result = await translateText(dialogue[index].text, 'zh-CN');
    setTranslations(prev => ({ ...prev, [index]: result }));
    setShowTranslation(prev => ({ ...prev, [index]: true }));
  }, [dialogue, translations]);

  const translateAll = useCallback(async () => {
    setTranslatingAll(true);
    const promises = dialogue.map(async (turn, i) => {
      if (translations[i]) return;
      const result = await translateText(turn.text, 'zh-CN');
      setTranslations(prev => ({ ...prev, [i]: result }));
      setShowTranslation(prev => ({ ...prev, [i]: true }));
    });
    for (let i = 0; i < promises.length; i += 5) {
      await Promise.all(promises.slice(i, i + 5));
    }
    setTranslatingAll(false);
  }, [dialogue, translations]);

  const toggleAllTranslations = useCallback(() => {
    const anyVisible = Object.values(showTranslation).some(v => v);
    const next: Record<number, boolean> = {};
    for (const key of Object.keys(translations)) {
      next[Number(key)] = !anyVisible;
    }
    setShowTranslation(next);
  }, [translations, showTranslation]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-background py-1 z-10">
        <h2 className="text-base font-semibold">
          对话记录 ({dialogue.length} 轮)
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={translateAll} disabled={translatingAll}>
            {translatingAll ? '翻译中...' : '全部翻译'}
          </Button>
          {Object.keys(translations).length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAllTranslations}>
              {Object.values(showTranslation).some(v => v) ? '隐藏译文' : '显示译文'}
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {dialogue.map((turn, i) => (
          <div
            key={i}
            data-utterance={i}
            className={`rounded-lg p-3 text-sm transition-all ${
              turn.role === 'user'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                turn.role === 'user' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {turn.role === 'user' ? 'User' : 'Assistant'}
              </span>
              <span className="text-xs text-muted-foreground">#{i}</span>
              <span className="ml-auto flex gap-1">
                {turn.role === 'user' && onLocateMemory && (
                  <button
                    className="text-xs text-green-600 hover:text-green-800 hover:underline"
                    onClick={() => onLocateMemory(i)}
                    title="定位到引用此对话的 Memory"
                  >
                    定位memory
                  </button>
                )}
                <button
                  className="text-xs text-blue-500 hover:text-blue-700"
                  onClick={() => translateOne(i)}
                >
                  {showTranslation[i] ? '隐藏' : '翻译'}
                </button>
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{turn.text}</p>
            {showTranslation[i] && translations[i] && (
              <div className="mt-2 pt-2 border-t border-dashed text-muted-foreground">
                <span className="text-xs font-medium text-blue-600 mr-1">译文:</span>
                <span className="whitespace-pre-wrap">{translations[i]}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
