# Model Selection Test Results - Codex Instructions

## Test Information
- **Test Type**: Model selection via natural language instructions
- **Label**: `test:instructions-codex`
- **Timestamp**: 2026-01-23T20:42:46.090Z
- **Test File**: `test-results/model-test-codex-instructions.md`

## Model Selection

### Requested Model
- **GPT-5.2-Codex** (as specified in agent_instructions)

### Actual Model Running
- **Claude 3.5 Sonnet** (Anthropic)

## Test Result

❌ **Model selection NOT successful**

The agent instructions requested GPT-5.2-Codex, but the actual model running this task is Claude 3.5 Sonnet from Anthropic. This indicates that:

1. Natural language model selection instructions in `custom_instructions` or `agent_instructions` do not control which underlying model executes the task
2. The model selection is determined by the system configuration, not by instructions within the prompt
3. Claude models cannot access or run GPT models (different providers)

## Confirmation

✅ This test was triggered via the `test:instructions-codex` label as confirmed in the issue description.

## Conclusions

- Model selection via natural language instructions in agent_instructions does NOT work
- The executing model (Claude 3.5 Sonnet) is determined by the GitHub Copilot configuration
- Instructions can REQUEST a model, but cannot CHANGE the underlying model being used
