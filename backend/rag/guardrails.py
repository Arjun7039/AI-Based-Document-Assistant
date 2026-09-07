"""Guardrails Module — Defense against prompt injections, jailbreaks, and data leakage.

Ensures:
1. User input is checked for malicious injection patterns and jailbreak attempts.
2. Context blocks are wrapped in defensive XML delimiters to prevent prompt hijacking.
3. Model outputs are audited for system prompt leakage or unsafe content.
"""

import re
from utils.logger import logger

# Regex patterns for common prompt injection and jailbreak techniques
_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)",
    r"(?i)disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"(?i)you\s+are\s+now\s+(in\s+)?developer\s+mode",
    r"(?i)you\s+are\s+now\s+dan\b",
    r"(?i)do\s+anything\s+now\b",
    r"(?i)bypass\s+(all\s+)?(filters|safeguards|rules|limitations)",
    r"(?i)system\s*prompt\s*override",
    r"(?i)print\s+(your\s+)?(system\s+prompt|initial\s+instructions)",
    r"(?i)reveal\s+(your\s+)?(system\s+prompt|instructions|secret\s+key|api\s*key)",
    r"(?i)repeat\s+the\s+words\s+above",
    r"(?i)output\s+everything\s+above",
    r"(?i)<\s*system\s*>",
    r"(?i)\[\s*system\s*\]",
]

_COMPILED_PATTERNS = [re.compile(p) for p in _INJECTION_PATTERNS]


def sanitize_user_input(question: str) -> tuple[str, bool]:
    """Sanitize user query and detect potential prompt injection attacks.

    Args:
        question: Raw user question string.

    Returns:
        tuple[str, bool]: (cleaned_question, is_suspicious)
    """
    if not question:
        return "", False

    cleaned = question.strip()

    # Check for known prompt injection patterns
    for pattern in _COMPILED_PATTERNS:
        if pattern.search(cleaned):
            logger.warning(f"Prompt injection pattern detected in query: '{cleaned[:60]}...'")
            return cleaned, True

    # Strip potential XML delimiter breakouts that could trick the prompt builder
    cleaned = cleaned.replace("</ContextBlock>", "")
    cleaned = cleaned.replace("</untrusted_document_context>", "")
    cleaned = cleaned.replace("<ContextBlock", "")
    cleaned = cleaned.replace("<untrusted_document_context", "")

    return cleaned, False


def wrap_untrusted_context(chunks: list[dict]) -> str:
    """Format retrieved document chunks inside defensive XML containers.

    Explicitly instructs the LLM that content within these blocks is UNTRUSTED
    DATA and MUST NEVER be executed as instructions or commands.
    """
    if not chunks:
        return "No relevant context was found in the uploaded documents."

    context_parts = []
    for i, c in enumerate(chunks):
        doc_name = c.get("filename", "Unknown")
        page_num = c.get("page", "Unknown")
        score = c.get("score", 0.0)
        raw_text = c.get("text", "")

        # Neutralize any attempts inside the document to masquerade as system instructions
        safe_text = raw_text.replace("</untrusted_document_context>", "[ESCAPED_TAG]")
        safe_text = safe_text.replace("SYSTEM:", "[DOCUMENT_TEXT]:")

        context_parts.append(
            f'<untrusted_document_context id="{i+1}" source="{doc_name}" page="{page_num}" relevance="{score:.2f}">\n'
            f"{safe_text}\n"
            f"</untrusted_document_context>"
        )

    return "\n\n".join(context_parts)


def audit_model_output(answer: str) -> str:
    """Audit the LLM's generated response to ensure no system secrets are leaked."""
    if not answer:
        return answer

    # Check for leaked API key patterns
    if re.search(r"AIza[0-9A-Za-z-_]{35}", answer) or re.search(r"gsk_[0-9A-Za-z]{40,}", answer):
        logger.error("ALERT: LLM response attempted to leak an API key. Suppressing.")
        return "The response could not be displayed due to security policy enforcement."

    return answer
