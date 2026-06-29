import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 120s — handles Render free-tier cold starts (30-60s)
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor: attach JWT if available ───
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('docmind_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: handle 401 with token refresh ───
let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already tried refreshing
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const currentToken = localStorage.getItem('docmind_token')
      if (!currentToken) {
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshResponse = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            {
              headers: { Authorization: `Bearer ${currentToken}` },
              timeout: 120000,
            }
          )
          const newToken = refreshResponse.data.access_token
          localStorage.setItem('docmind_token', newToken)

          // Update user data if returned
          if (refreshResponse.data.user) {
            // Store will be updated when the retried request completes
          }

          isRefreshing = false
          onTokenRefreshed(newToken)

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          refreshSubscribers = []
          localStorage.removeItem('docmind_token')
          return Promise.reject(error)
        }
      } else {
        // Another refresh is in progress — queue this request
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }
    }

    return Promise.reject(error)
  }
)

// ─── Mock Data ───
const MOCK_DELAY = 800

const mockDocuments = [
  {
    id: 'doc_demo1',
    filename: 'Q3_Financial_Report.pdf',
    file_type: 'pdf',
    status: 'ready',
    pages: 47,
    chunks_indexed: 182,
    uploaded_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'doc_demo2',
    filename: 'Product_Roadmap_2026.docx',
    file_type: 'docx',
    status: 'ready',
    pages: 12,
    chunks_indexed: 38,
    uploaded_at: new Date(Date.now() - 7200000).toISOString(),
  },
]

const mockResponses = [
  {
    answer:
      "Based on the Q3 Financial Report, total revenue was **₹42.3 crore**, representing a **14% increase** compared to Q2. The primary growth drivers were:\n\n1. **Enterprise subscriptions** — up 22% QoQ\n2. **API usage fees** — up 18% QoQ\n3. **Professional services** — stable at ₹3.1 crore\n\nOperating margins improved to **28.4%**, up from 25.1% in Q2, primarily due to infrastructure cost optimization.",
    sources: [
      {
        document_id: 'doc_demo1',
        filename: 'Q3_Financial_Report.pdf',
        page: 12,
        chunk:
          'Total revenue for Q3 stood at ₹42.3 crore compared to ₹37.1 crore in Q2, marking a 14% quarter-over-quarter increase. Enterprise subscription revenue grew 22% to ₹24.7 crore...',
        score: 0.94,
      },
      {
        document_id: 'doc_demo1',
        filename: 'Q3_Financial_Report.pdf',
        page: 15,
        chunk:
          'Operating margins improved significantly to 28.4% in Q3, up from 25.1% in Q2. This improvement was driven by a 15% reduction in cloud infrastructure costs following the migration to...',
        score: 0.89,
      },
      {
        document_id: 'doc_demo1',
        filename: 'Q3_Financial_Report.pdf',
        page: 8,
        chunk:
          'API usage fees contributed ₹14.5 crore in Q3, an 18% increase from Q2. The growth was attributed to three new enterprise clients onboarded during the quarter...',
        score: 0.85,
      },
    ],
    tokens_used: 1840,
    latency_ms: 1120,
  },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Check if backend is available (with retry for cold starts) ───
let backendAvailable = null
let backendCheckInProgress = null

export async function checkBackend(forceRecheck = false) {
  if (backendAvailable === true && !forceRecheck) return true

  // If a check is already in progress, wait for it
  if (backendCheckInProgress) return backendCheckInProgress

  backendCheckInProgress = _doBackendCheck()
  const result = await backendCheckInProgress
  backendCheckInProgress = null
  return result
}

async function _doBackendCheck() {
  const url = `${API_URL}/api/health`
  console.log('[DocMind] Checking backend at:', url || '(empty — VITE_API_URL not set!)')

  // Try up to 3 times with increasing delays for cold starts
  const attempts = [60000, 30000, 15000] // timeouts: 60s, 30s, 15s
  for (let i = 0; i < attempts.length; i++) {
    try {
      const res = await axios.get(url, { timeout: attempts[i] })
      const contentType = res.headers?.['content-type'] || ''
      backendAvailable = contentType.includes('application/json') && res.data?.status === 'ok'
      if (backendAvailable) {
        console.log('[DocMind] Backend connected:', res.data)
        return true
      }
    } catch (err) {
      console.warn(`[DocMind] Backend check attempt ${i + 1}/${attempts.length} failed:`, err.message)
      if (i < attempts.length - 1) {
        await delay(2000) // Wait 2s before retry
      }
    }
  }

  console.error('[DocMind] Backend check FAILED after all attempts')
  backendAvailable = false
  return false
}

// ─── Wrapper that waits for backend before making API calls ───
async function ensureBackend() {
  if (backendAvailable === true) return true
  return await checkBackend(true)
}

// ─── API Functions ───
export async function uploadFile(file, sessionId, onProgress) {
  const isLive = await ensureBackend()

  if (isLive) {
    const formData = new FormData()
    formData.append('file', file)
    if (sessionId) formData.append('session_id', sessionId)

    const response = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min for large file uploads
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress?.(percent)
      },
    })
    return response.data
  }

  // Mock upload
  for (let i = 0; i <= 100; i += 10) {
    await delay(120)
    onProgress?.(i)
  }
  await delay(MOCK_DELAY)

  return {
    document_id: `doc_${Date.now()}`,
    filename: file.name,
    file_type: file.name.split('.').pop(),
    status: 'processing',
    pages: Math.floor(Math.random() * 50) + 5,
    session_id: sessionId,
  }
}

export async function pollDocumentStatus(documentId) {
  const isLive = await ensureBackend()

  if (isLive) {
    const response = await api.get(`/api/documents/${documentId}/status`)
    return response.data
  }

  await delay(MOCK_DELAY)
  return {
    document_id: documentId,
    status: 'ready',
    chunks_indexed: Math.floor(Math.random() * 200) + 20,
    processing_time_ms: Math.floor(Math.random() * 5000) + 1000,
  }
}

export async function queryDocuments(question, sessionId, documentIds, topK, imageFile) {
  const isLive = await ensureBackend()

  if (isLive) {
    const formData = new FormData()
    formData.append('question', question)
    if (sessionId) formData.append('session_id', sessionId)
    if (documentIds && documentIds.length > 0) {
      formData.append('document_ids', JSON.stringify(documentIds))
    }
    if (topK) formData.append('top_k', topK)
    if (imageFile) formData.append('file', imageFile)

    const response = await api.post('/api/query', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 min for complex queries on large docs
    })
    return response.data
  }

  // Mock query
  await delay(1500 + Math.random() * 1000)
  const mock = mockResponses[0]
  return {
    ...mock,
    answer: mock.answer,
    latency_ms: Math.floor(Math.random() * 2000) + 800,
  }
}

export async function getSessionDocuments(sessionId) {
  const isLive = await ensureBackend()

  if (isLive) {
    const response = await api.get(`/api/sessions/${sessionId}/documents`)
    return response.data
  }

  await delay(300)
  return { session_id: sessionId, documents: mockDocuments }
}

export async function deleteDocument(documentId) {
  const isLive = await ensureBackend()

  if (isLive) {
    await api.delete(`/api/documents/${documentId}`)
    return true
  }

  await delay(300)
  return true
}

export async function fetchSessions() {
  const isLive = await ensureBackend()
  if (isLive) {
    const response = await api.get('/api/sessions')
    return response.data.sessions
  }
  return []
}

export async function removeSession(sessionId) {
  const isLive = await ensureBackend()
  if (isLive) {
    await api.delete(`/api/sessions/${sessionId}`)
    return true
  }
  return true
}

export async function fetchSessionDetails(sessionId) {
  const isLive = await ensureBackend()
  if (isLive) {
    const response = await api.get(`/api/sessions/${sessionId}`)
    return response.data
  }
  return null
}

export async function registerUser(email, password) {
  const isLive = await ensureBackend()
  if (isLive) {
    const response = await api.post('/api/auth/register', { email, password })
    return response.data
  }
  await delay(800)
  return {
    access_token: 'mock_token_123',
    token_type: 'bearer',
    user: { user_id: 'mock_user_id', email, is_active: true }
  }
}

export async function loginUser(email, password) {
  const isLive = await ensureBackend()
  if (isLive) {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  }
  await delay(800)
  return {
    access_token: 'mock_token_123',
    token_type: 'bearer',
    user: { user_id: 'mock_user_id', email, is_active: true }
  }
}

export async function getCurrentUser() {
  const isLive = await ensureBackend()
  if (isLive) {
    const response = await api.get('/api/auth/me')
    return response.data
  }
  return { user_id: 'mock_user_id', email: 'demo@docmind.ai', is_active: true }
}

export async function refreshAccessToken() {
  const token = localStorage.getItem('docmind_token')
  if (!token) return null
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/refresh`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000,
      }
    )
    const newToken = response.data.access_token
    localStorage.setItem('docmind_token', newToken)
    return response.data
  } catch {
    return null
  }
}

export default api
