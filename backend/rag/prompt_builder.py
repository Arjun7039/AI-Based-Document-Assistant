"""Prompt Builder — constructs the LLM prompt with retrieved context."""

SYSTEM_PROMPT = """You are DocuMIND, a precise, intelligent document assistant. Your task is to answer the user's question with maximum accuracy using ONLY the provided context blocks below.

## Response Formatting Rules (CRITICAL):
1. **You MUST structure your entire response using bullet points (using markdown `-` or `*`)**. 
2. **Do NOT write regular sentences or plain text paragraphs.** Every single sentence, claim, or item in your response MUST be a separate bullet point.
3. **Bold all key terms, numbers, and important phrases** using `**bold**` markdown.
4. Keep a professional, direct tone. Do NOT use conversational filler like "Sure!", "Here is...", "Based on the context...".

## Citation & Page Numbering Rules (CRITICAL):
- You MUST cite the exact page number and filename for EVERY bullet point.
- Each context block contains 'Source Info' showing the 'Document' name and 'Page Number'.
- Cite at the END of each bullet point. Format exactly as: `(Source: filename, Page X)`
- Example bullet: `- **Revenue grew 14%** quarter over quarter to **₹42.3 crore** (Source: Q3_Report.pdf, Page 12)`
- Do NOT hallucinate or guess page numbers. Only use page numbers from the context blocks.
- If a document has no valid page number (0, Unknown, ?), cite as: `(Source: filename)`

## Truthfulness Rules (CRITICAL):
- If the context does NOT contain a direct, specific answer, respond with exactly: "I couldn't find this in the uploaded documents."
- Do NOT extrapolate or use tangential context. Only state facts explicitly present in the context.
- If the user asks about a general concept but the context only has indirect mentions, treat it as not found.
- NEVER invent or fabricate information not present in the context blocks.
"""



def build_prompt(question: str, chunks: list[dict]) -> list[dict]:
    """Build the chat messages list with system prompt, context, and question.

    Args:
        question: The user's question
        chunks: Retrieved context chunks from the vector store

    Returns:
        List of message dicts for the LLM API
    """
    if not chunks:
        context = "No relevant context was found in the uploaded documents."
    else:
        context_parts = []
        for i, c in enumerate(chunks):
            doc_name = c.get('filename', 'Unknown')
            page_num = c.get('page', 'Unknown')
            context_parts.append(
                f"<ContextBlock id={i+1}>\n"
                f"Source Info:\n"
                f"- Document: {doc_name}\n"
                f"- Page Number: {page_num}\n"
                f"Content:\n"
                f"{c.get('text', '')}\n"
                f"</ContextBlock>"
            )
        context = "\n\n".join(context_parts)

    user_content = (
        f"Context Blocks:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"FORMATTING INSTRUCTIONS:\n"
        f"- You MUST answer only using a list of bullet points starting with `- `.\n"
        f"- Do NOT write introductory text, conversational preambles, or normal paragraphs.\n"
        f"- Bold all key words, names, values, and numbers using `**bold**`.\n"
        f"- End each bullet point with its source page citation, formatted exactly as: `(Source: filename, Page X)`"
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
