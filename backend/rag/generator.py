"""LLM Generator — generates answers using a 3-tier fallback chain.

Model priority:
  1. gemini-3.5-flash (primary — advanced, fast, and high reasoning)
  2. gemini-2.5-pro (secondary fallback — heavy reasoning if primary fails)
  3. Groq llama-3.3-70b (final fallback — if Gemini fails or quota exhausted)
"""

from google.api_core.exceptions import ResourceExhausted
import google.generativeai as genai
from config import settings
from utils.logger import logger

_gemini_configured = False
_groq_client = None


def _ensure_gemini():
    global _gemini_configured
    if not _gemini_configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_configured = True


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        if not settings.GROQ_API_KEY:
            return None
        from groq import Groq
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def generate_answer(messages: list[dict], image_bytes: bytes | None = None, image_mime: str | None = None) -> dict:
    """Generate an answer using the LLM with a 3-tier fallback chain.

    Priority: gemini-3.5-flash → gemini-2.5-pro → Groq llama-3.3-70b
    """
    # Tier 1: Primary model (gemini-3.5-flash)
    primary_model = settings.LLM_MODEL
    try:
        return _call_gemini(messages, image_bytes, image_mime, model_name=primary_model)
    except ResourceExhausted:
        logger.warning(f"{primary_model} quota exceeded. Falling back to {settings.LLM_FALLBACK_MODEL}...")
    except Exception as e:
        logger.warning(f"{primary_model} failed: {e}. Falling back to {settings.LLM_FALLBACK_MODEL}...")

    # Tier 2: Secondary Fallback (gemini-2.5-pro)
    fallback_model = settings.LLM_FALLBACK_MODEL
    if fallback_model and fallback_model != primary_model:
        try:
            return _call_gemini(messages, image_bytes, image_mime, model_name=fallback_model)
        except ResourceExhausted:
            logger.warning(f"{fallback_model} also exhausted. Falling back to Groq...")
        except Exception as e:
            logger.warning(f"{fallback_model} failed: {e}. Falling back to Groq...")

    # Tier 3: Groq fallback
    try:
        groq_client = _get_groq_client()
        if groq_client:
            return _call_groq(messages)
        else:
            logger.error("No Groq API key configured for fallback")
    except Exception as e:
        logger.error(f"Groq fallback also failed: {e}")

    raise RuntimeError("All LLM providers failed. Check your API keys and quotas.")


def _call_gemini(
    messages: list[dict],
    image_bytes: bytes | None = None,
    image_mime: str | None = None,
    model_name: str | None = None,
) -> dict:
    """Call Google Gemini with a specified model."""
    _ensure_gemini()

    model_name = model_name or settings.LLM_MODEL

    system_instruction = None
    gemini_messages = []

    # Convert standard roles to Gemini roles (user, model)
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        elif msg["role"] == "user":
            parts = [msg["content"]]
            if image_bytes and image_mime:
                parts.append({"mime_type": image_mime, "data": image_bytes})
            gemini_messages.append({"role": "user", "parts": parts})
        elif msg["role"] == "assistant":
            gemini_messages.append({"role": "model", "parts": [msg["content"]]})

    logger.info(f"Calling Gemini model: {model_name}")

    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_instruction
    )

    response = model.generate_content(
        gemini_messages,
        generation_config=genai.types.GenerationConfig(
            temperature=settings.LLM_TEMPERATURE,
            max_output_tokens=settings.MAX_CONTEXT_TOKENS,
        )
    )

    tokens_used = 0
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        tokens_used = response.usage_metadata.total_token_count

    logger.info(f"Gemini response: {tokens_used} tokens ({model_name})")

    return {
        "answer": response.text,
        "tokens_used": tokens_used,
        "model": model_name,
    }


def _call_groq(messages: list[dict]) -> dict:
    """Call Groq llama-3.3-70b as final fallback."""
    client = _get_groq_client()
    groq_model = "llama-3.3-70b-versatile"

    response = client.chat.completions.create(
        model=groq_model,
        messages=messages,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=min(settings.MAX_CONTEXT_TOKENS, 8000),  # Groq has a lower limit
    )

    choice = response.choices[0]
    usage = response.usage

    logger.info(f"Groq response: {usage.total_tokens} tokens ({groq_model})")

    return {
        "answer": choice.message.content,
        "tokens_used": usage.total_tokens,
        "model": groq_model,
    }
