# Golden Memory 标注工具

人工校正和补全 session 级别的 golden memory 数据，纯浏览器运行，无需后端。

---

## 启动

需要 [Node.js](https://nodejs.org/) v18+。

```bash
cd golden-memory-annotation
npm install      # 首次运行
npm run dev      # 启动，浏览器自动打开 http://localhost:3001
```

---

## 使用流程

**1. 加载数据** — 点击「选择文件夹」，选择 `split_1` 文件夹（直接包含 `sess_xxx__NNN` 子文件夹的那一层）。

**2. 标注** — 页面三栏：左栏对话（只读）、中栏 Golden 编辑区、右栏模型参考（只读）。

> **标注范围**：只纳入跨对话、对个性化有意义的长期记忆。仅在本次对话内有效的临时信息（当前任务、当前话题背景等）不纳入 golden。`time_scope` 只用 `long_term` / `short_term` / `unknown`，不标 `recent`。

每个 session 的操作顺序：
1. 读左栏对话，理解上下文
2. 检查中栏现有 golden，不合理的直接改或删
3. 参考右栏模型输出，有遗漏的点「加入 Golden」或手动「+ 新增」
4. 点「保存」，该 session 标记为已完成

**3. 导出** — 顶部两个导出按钮：
- 「导出标注」— 备份用，可导入继续
- 「导出结果」— **最终提交的文件**，只含已完成的 session

---

---

## 快捷键

`←` / `A` 上一个 session，`→` / `D` 下一个 session（输入框内不触发）
重要：切换下一个之前先手动保存！
---

## 数据保存

标注自动存入浏览器 localStorage，刷新不丢失。**换浏览器或清除浏览器数据会丢失**，请定期「导出标注」备份。换设备继续标注时，先「导入」之前的备份文件。

---

## 输出格式

### 导出标注（备份文件）

```json
{
  "sess_00111774b2f3__4792": {
    "sessionKey": "sess_00111774b2f3__4792",
    "status": "done",
    "updatedAt": "2026-04-05T10:30:00.000Z",
    "golden_answer": [
      {
        "memory_id": "m1",
        "type": "direct",
        "label": "Preferences/Interaction_Preferences",
        "label_suggestion": null,
        "value": "User communicates in Portuguese",
        "reasoning": "User consistently writes in Portuguese throughout the conversation",
        "evidence": {
          "session_id": "sess_00111774b2f3",
          "utterance_index": 0,
          "text": "Olá. Você pode escrever uma letra de música para mim?"
        },
        "confidence": 0.95,
        "time_scope": "long_term",
        "emotion": null,
        "preference_attitude": null,
        "updated_at": "2026-04-05T10:30:00.000Z"
      }
    ]
  }
}
```

### 导出结果

仅含 `status: "done"` 的 session，每条去掉 `sessionKey` 和 `status`，顶层 key 增加 `session_id` 和 `canonical_id` 字段。

---

## 常见问题

**加载不出来** — 确认选的是 `split_1` 本身，不是上级目录。

**中途退出** — 直接关页面，下次重新选文件夹后标注自动恢复。建议同时导出备份。

**多人标注** — 各自独立标注，最后分别导出结果文件交给老师合并。

**想撤销某个 session 的修改** — 若未保存，重新加载文件夹即可恢复原始数据；若已保存，需手动改回或清除 localStorage 对应条目。