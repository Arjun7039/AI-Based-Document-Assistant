import { useState, useCallback } from 'react'
import { queryDocuments } from '../api/client'
import useStore from '../store/useStore'

export default function useChat() {
  const [error, setError] = useState(null)
  const {
    activeSessionId,
    createSession,
    addMessage,
    updateMessage,
    setSources,
    setQueryState,
    openSourcePanel,
    selectedDocumentIds,
  } = useStore()

  const send = useCallback(async (question, imageFile, imagePreviewUrl) => {
    if (!question.trim() && !imageFile) return
    setError(null)

    // Ensure we have an active session
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    // Add user message
    addMessage({
      role: 'user',
      content: question.trim(),
      imageUrl: imagePreviewUrl,
    })

    // Add placeholder assistant message
    const assistantMsg = addMessage({
      role: 'assistant',
      content: '',
      isLoading: true,
    })

    try {
      setQueryState(true)

      const response = await queryDocuments(
        question.trim(),
        sessionId,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        undefined,
        imageFile
      )

      // Safely extract sources — always array
      const responseSources = Array.isArray(response.sources) ? response.sources : []

      // Update assistant message with response
      updateMessage(assistantMsg.id, {
        content: response.answer || 'No response received.',
        isLoading: false,
        tokensUsed: response.tokens_used,
        latencyMs: response.latency_ms,
        sources: responseSources,
      })

      // Set sources and open panel
      if (responseSources.length > 0) {
        setSources(responseSources)
        openSourcePanel()
      }

    } catch (queryError) {
      console.error('Query failed:', queryError)
      const msg =
        queryError.response?.data?.detail ||
        queryError.message ||
        'Failed to get response. Please try again.'
      setError(msg)
      updateMessage(assistantMsg.id, {
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        isLoading: false,
        isError: true,
        sources: [],
      })
    } finally {
      setQueryState(false)
    }
  }, [activeSessionId, createSession, addMessage, updateMessage, setSources, setQueryState, openSourcePanel, selectedDocumentIds])

  return {
    send,
    error,
    clearError: () => setError(null),
  }
}
