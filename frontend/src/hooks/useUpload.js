import { useState, useCallback } from 'react'
import { uploadFile, pollDocumentStatus } from '../api/client'
import useStore from '../store/useStore'

export default function useUpload() {
  const [error, setError] = useState(null)
  const {
    activeSessionId,
    createSession,
    addDocument,
    updateDocument,
    setUploadState,
  } = useStore()

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'application/json',
  ]

  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'pptx', 'txt', 'md', 'json']
  const MAX_SIZE_MB = 50

  const validateFile = useCallback((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type: .${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`
    }
    return null
  }, [])

  const upload = useCallback(async (file) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return null
    }

    // Ensure we have an active session
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    try {
      setUploadState(true, 0)

      // Upload the file
      const result = await uploadFile(file, sessionId, (progress) => {
        setUploadState(true, progress)
      })

      // Add document to store
      const doc = {
        id: result.document_id,
        filename: result.filename,
        fileType: result.file_type,
        status: 'processing',
        pages: result.pages,
        chunksIndexed: 0,
        uploadedAt: new Date().toISOString(),
      }
      addDocument(doc)

      // Update session title based on first uploaded file
      const { sessions, updateSessionTitle } = useStore.getState()
      const session = sessions.find((s) => s.id === sessionId)
      if (session && session.title === 'New Chat') {
        const shortName = file.name.length > 30
          ? file.name.substring(0, 27) + '...'
          : file.name
        updateSessionTitle(sessionId, shortName)
      }

      // Poll for processing completion
      setUploadState(true, 100)
      let attempts = 0
      const maxAttempts = 60

      const poll = async () => {
        while (attempts < maxAttempts) {
          attempts++
          await new Promise((r) => setTimeout(r, 2000))

          try {
            const status = await pollDocumentStatus(result.document_id)

            if (status.status === 'ready') {
              updateDocument(result.document_id, {
                status: 'ready',
                chunksIndexed: status.chunks_indexed,
              })
              setUploadState(false, 0)
              return
            }

            if (status.status === 'failed') {
              updateDocument(result.document_id, { status: 'failed' })
              setError('Document processing failed. Please try again.')
              setUploadState(false, 0)
              return
            }
          } catch (pollError) {
            // Continue polling on network errors
          }
        }

        // Timeout
        updateDocument(result.document_id, { status: 'failed' })
        setError('Processing timed out. Please try again.')
        setUploadState(false, 0)
      }

      poll()
      return result

    } catch (uploadError) {
      const msg =
        uploadError.response?.data?.detail ||
        uploadError.message ||
        'Upload failed. Please try again.'
      setError(msg)
      setUploadState(false, 0)
      return null
    }
  }, [activeSessionId, createSession, addDocument, updateDocument, setUploadState, validateFile])

  return {
    upload,
    error,
    clearError: () => setError(null),
  }
}
