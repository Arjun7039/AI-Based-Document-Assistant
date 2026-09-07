import { useState, useCallback } from 'react'
import { queryDocuments, queryDocumentsStream } from '../api/client'
import useStore from '../store/useStore'

export default function useChat() {
  const [error, setError] = useState(null)
  const {
    activeSessionId,
    createSession,
    addMessage,
    updateMessage,
    setSources,
    setEvaluationData,
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

    // Auto-title the session from the first question if still "New Chat"
    const { sessions, updateSessionTitle } = useStore.getState()
    const currentSession = sessions.find((s) => s.id === sessionId)
    if (currentSession && currentSession.title === 'New Chat' && question.trim()) {
      const shortQ = question.trim().length > 35 ? question.trim().substring(0, 32) + '...' : question.trim()
      updateSessionTitle(sessionId, shortQ)
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

      let streamedContent = ''

      await queryDocumentsStream(
        question.trim(),
        sessionId,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        undefined,
        imageFile,
        {
          onStatus: (statusEvent) => {
            updateMessage(assistantMsg.id, {
              statusMessage: statusEvent.message,
            })
          },
          onSources: (incomingSources, cragGrade, confidenceScore, evaluationDetails) => {
            const safeSources = Array.isArray(incomingSources) ? incomingSources : []
            if (safeSources.length > 0) {
              setSources(safeSources, {
                cragGrade,
                confidenceScore,
                evaluationDetails,
              })
              openSourcePanel()
            }
            updateMessage(assistantMsg.id, {
              sources: safeSources,
              cragGrade: cragGrade,
              confidenceScore: confidenceScore,
              evaluationDetails: evaluationDetails,
            })
          },
          onToken: (delta) => {
            streamedContent += delta
            updateMessage(assistantMsg.id, {
              content: streamedContent,
              isLoading: false,
              statusMessage: null,
            })
          },
          onDone: (doneData) => {
            if (doneData) {
              setEvaluationData({
                latencyMs: doneData.latency_ms,
                cached: doneData.cached,
                cragGrade: doneData.crag_grade,
                confidenceScore: doneData.confidence_score,
              })
            }
            updateMessage(assistantMsg.id, {
              content: streamedContent || 'No response generated.',
              isLoading: false,
              statusMessage: null,
              latencyMs: doneData?.latency_ms,
              cached: doneData?.cached,
              cragGrade: doneData?.crag_grade,
              confidenceScore: doneData?.confidence_score,
            })
          },
          onError: (streamErr) => {
            console.error('Streaming error:', streamErr)
            if (!streamedContent) {
              updateMessage(assistantMsg.id, {
                content: 'Sorry, I encountered an error processing your question. Please try again.',
                isLoading: false,
                isError: true,
                sources: [],
              })
            }
          },
        }
      )
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
