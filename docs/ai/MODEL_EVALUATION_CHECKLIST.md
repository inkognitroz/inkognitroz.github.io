# Model evaluation checklist

## Goal
Evaluate local and hosted models pragmatically before they become default choices in SaaS Fabric.

## Evaluation dimensions

### 1. Quality
- Does the model answer the actual question?
- Does it follow system instructions?
- Does it avoid invented facts?
- Does it handle Norwegian and English well?
- Does it produce usable code and structured outputs?

### 2. Speed
- Time to first response.
- Total latency.
- Usability on the target machine.
- Performance under longer prompts.

### 3. Cost
- Local hardware cost.
- Hosted token/API cost.
- Expected monthly cost at realistic usage.

### 4. Privacy
- Local-only or cloud-hosted.
- Data retention policy.
- Suitability for private documents.

### 5. Reliability
- Stable responses.
- Handles long sessions.
- Does not crash browser or backend.
- Clear error messages.

## Minimal test set
Run every candidate model through:
1. Short factual answer.
2. Norwegian professional writing task.
3. Code generation task.
4. JSON generation task.
5. RAG-style answer with citations requirement.
6. Long prompt summarization.
7. Safety/privacy refusal around secrets.

## Score table
Use 1-5 scoring.

| Model | Quality | Speed | Cost | Privacy | Reliability | Notes |
|---|---:|---:|---:|---:|---:|---|
| llama3.1 |  |  |  |  |  |  |
| mistral |  |  |  |  |  |  |
| codellama |  |  |  |  |  |  |

## Promotion rule
A model can be marked as recommended only when:
- quality >= 4
- reliability >= 4
- no secret handling issues
- test results are documented
