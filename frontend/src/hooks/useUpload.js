import { useState, useCallback, useRef } from 'react'
import { uploadFile, pollDocumentStatus } from '../api/client'
import useStore from '../store/useStore'

// How many files to push to the server at once — 2 keeps the free-tier
// backend responsive while still overlapping network + processing time.
const UPLOAD_CONCURRENCY = 2

export default function useUpload() {
  const [error, setError] = useState(null)
  const {
    activeSessionId,
    createSession,
    addDocument,
    updateDocument,
    setUploadState,
  } = useStore()

  // Refs let concurrent workers share queue state without re-render churn
  const completedCount = useRef(0)
  const totalFiles = useRef(0)
  // Per-file upload fractions (0–1) keyed by queue index — drives aggregate %
  const fileFractions = useRef({})

  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'pptx', 'txt', 'md', 'json', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']
  const MAX_SIZE_MB = 200

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

  /** Aggregate progress = finished files + sum of in-flight file fractions */
  const reportProgress = useCallback(() => {
    if (totalFiles.current === 0) return
    const inflight = Object.values(fileFractions.current).reduce((sum, f) => sum + f, 0)
    const percent = Math.round(((completedCount.current + inflight) / totalFiles.current) * 100)
    setUploadState(true, Math.min(percent, 99))
  }, [setUploadState])

  /** Poll backend until processing finishes — writes live % into the doc row */
  const pollProcessing = useCallback((documentId) => {
    let attempts = 0
    const maxAttempts = 300  // 300 × 2s = 10 min timeout for large docs

    const tick = async () => {
      while (attempts < maxAttempts) {
        attempts++
        await new Promise((r) => setTimeout(r, attempts <= 3 ? 1200 : 2000))

        try {
          const status = await pollDocumentStatus(documentId)

          if (status.status === 'ready') {
            updateDocument(documentId, {
              status: 'ready',
              chunksIndexed: status.chunks_indexed,
              pages: status.pages,
              progressPercent: 100,
            })
            return
          }

          if (status.status === 'failed') {
            updateDocument(documentId, { status: 'failed', errorMessage: status.error_message })
            setError('Document processing failed. Please try again.')
            return
          }

          // Still processing — surface live progress from the backend
          updateDocument(documentId, {
            status: status.status,
            progressPercent: status.progress_percent || 0,
          })
        } catch {
          // Transient network errors — keep polling
        }
      }

      updateDocument(documentId, { status: 'failed' })
      setError('Processing timed out. Please try again.')
    }

    tick()
  }, [updateDocument])

  /** Upload one file and start polling its processing status */
  const uploadOne = useCallback(async (file, sessionId, queueIndex) => {
    setError(null)
    fileFractions.current[queueIndex] = 0

    const validationError = validateFile(file)
    if (validationError) {
      setError(`${file.name}: ${validationError}`)
      return null
    }

    try {
      const result = await uploadFile(file, sessionId, (percent) => {
        fileFractions.current[queueIndex] = percent / 100
        reportProgress()
      })
      delete fileFractions.current[queueIndex]

      addDocument({
        id: result.document_id,
        filename: result.filename,
        fileType: result.file_type,
        status: 'processing',
        pages: result.pages,
        chunksIndexed: 0,
        progressPercent: 0,
        uploadedAt: new Date().toISOString(),
      })

      // Name the session after the first uploaded file
      const { sessions, updateSessionTitle } = useStore.getState()
      const session = sessions.find((s) => s.id === sessionId)
      if (session && session.title === 'New Chat') {
        const shortName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name
        updateSessionTitle(sessionId, shortName)
      }

      pollProcessing(result.document_id)
      return result

    } catch (uploadError) {
      const msg =
        uploadError.response?.data?.detail ||
        uploadError.message ||
        'Upload failed. Please try again.'
      setError(`${file.name}: ${msg}`)
      return null
    }
  }, [validateFile, reportProgress, addDocument, pollProcessing])

  /** Entry point — accepts a single file OR a list of files */
  const upload = useCallback(async (filesInput) => {
    const files = Array.from(filesInput || [])
    if (files.length === 0) return null

    // Ensure we have an active session before any request fires
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    completedCount.current = 0
    totalFiles.current = files.length
    setUploadState(true, 0)

    // Simple worker pool: UPLOAD_CONCURRENCY uploads run in parallel
    let nextIndex = 0
    const worker = async () => {
      while (nextIndex < files.length) {
        const index = nextIndex++
        await uploadOne(files[index], sessionId, index)
        completedCount.current++
        reportProgress()
      }
    }

    const workers = Array.from(
      { length: Math.min(UPLOAD_CONCURRENCY, files.length) },
      () => worker()
    )
    await Promise.all(workers)

    setUploadState(false, 0)
    totalFiles.current = 0
    return true
  }, [activeSessionId, createSession, uploadOne, reportProgress, setUploadState])

  return {
    upload,
    error,
    clearError: () => setError(null),
  }
}
