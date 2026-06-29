import { create } from 'zustand'
import {
  loginUser,
  registerUser,
  getCurrentUser,
  refreshAccessToken,
  fetchSessions,
  removeSession,
  fetchSessionDetails,
  getSessionDocuments,
  deleteDocument,
  checkBackend,
} from '../api/client'

const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const useStore = create((set, get) => ({
  // ─── Authentication ───
  user: null,
  token: localStorage.getItem('docmind_token') || null,
  isAuthenticating: false,
  authError: null,
  backendReady: null, // null = unknown, true = connected, false = unreachable

  loginAction: async (email, password) => {
    set({ isAuthenticating: true, authError: null })
    try {
      const data = await loginUser(email, password)
      localStorage.setItem('docmind_token', data.access_token)
      set({ user: data.user, token: data.access_token, isAuthenticating: false })
      // Load sessions but do NOT auto-switch — let user stay on welcome screen
      await get().loadSessions(false)
      return true
    } catch (err) {
      set({
        authError: err.response?.data?.detail || 'Invalid email or password',
        isAuthenticating: false,
      })
      return false
    }
  },

  registerAction: async (email, password) => {
    set({ isAuthenticating: true, authError: null })
    try {
      const data = await registerUser(email, password)
      localStorage.setItem('docmind_token', data.access_token)
      set({ user: data.user, token: data.access_token, isAuthenticating: false })
      // Load sessions but do NOT auto-switch
      await get().loadSessions(false)
      return true
    } catch (err) {
      set({
        authError: err.response?.data?.detail || 'Registration failed. Try again.',
        isAuthenticating: false,
      })
      return false
    }
  },

  logoutAction: () => {
    localStorage.removeItem('docmind_token')
    set({
      user: null,
      token: null,
      sessions: [],
      activeSessionId: null,
      messages: [],
      documents: [],
      sources: [],
      selectedDocumentIds: [],
      isSourcePanelOpen: false,
    })
  },

  checkAuth: async () => {
    const token = get().token
    if (!token) {
      set({ backendReady: true }) // No token = backend check not needed for auth
      return
    }
    set({ isAuthenticating: true })

    // First, wait for the backend to be available (handles Render cold starts)
    const isLive = await checkBackend(true)
    set({ backendReady: isLive })

    if (!isLive) {
      // Backend is down — DON'T clear the token. Keep retrying.
      set({ isAuthenticating: false })
      // Retry after 10 seconds
      setTimeout(() => {
        get().checkAuth()
      }, 10000)
      return
    }

    // Backend is ready — try to verify the token
    try {
      const user = await getCurrentUser()
      set({ user, isAuthenticating: false })
      // Load sessions but do NOT auto-switch — user should see welcome/documents first
      await get().loadSessions(false)
    } catch (err) {
      const status = err.response?.status

      if (status === 401) {
        // Token is expired — try to refresh it
        console.log('[DocMind] Token expired, attempting refresh...')
        try {
          const refreshData = await refreshAccessToken()
          if (refreshData) {
            set({
              user: refreshData.user,
              token: refreshData.access_token,
              isAuthenticating: false,
            })
            await get().loadSessions(false)
            return
          }
        } catch {
          // Refresh also failed
        }
        // Both failed — clear auth state
        localStorage.removeItem('docmind_token')
        set({ user: null, token: null, isAuthenticating: false })
      } else {
        // Network error or server error — DON'T log out, just retry
        console.warn('[DocMind] Auth check failed (non-401), will retry:', err.message)
        set({ isAuthenticating: false })
        setTimeout(() => {
          get().checkAuth()
        }, 5000)
      }
    }
  },

  // ─── Sessions ───
  sessions: [],
  activeSessionId: null,

  loadSessions: async (autoSwitch = false) => {
    try {
      const sessions = await fetchSessions()
      const formatted = sessions.map((s) => ({
        id: s.session_id,
        title: s.title,
        createdAt: s.created_at,
        documentCount: s.document_count,
      }))
      set({ sessions: formatted })

      // Only auto-switch if explicitly requested AND no active session
      if (autoSwitch && formatted.length > 0 && !get().activeSessionId) {
        await get().switchSession(formatted[0].id)
      }
    } catch (e) {
      console.error('Failed to load sessions from backend', e)
    }
  },

  createSession: () => {
    const id = `sess_${generateId()}`
    const session = {
      id,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      documentCount: 0,
    }
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
      messages: [],
      documents: [],
      selectedDocumentIds: [],
      sources: [],
      isSourcePanelOpen: false,
    }))
    return id
  },

  switchSession: async (sessionId) => {
    set({
      activeSessionId: sessionId,
      messages: [],
      documents: [],
      selectedDocumentIds: [],
      sources: [],
      isSourcePanelOpen: false,
    })
    if (!sessionId) return
    try {
      const data = await fetchSessionDetails(sessionId)
      if (data) {
        const formattedMessages = (data.messages || []).map((m) => ({
          id: m.message_id,
          role: m.role,
          content: m.content || '',
          timestamp: m.created_at,
          image_url: m.image_url,
          sources: Array.isArray(m.sources) ? m.sources : [],
        }))
        const docsData = await getSessionDocuments(sessionId)
        const formattedDocs = (docsData?.documents || []).map((d) => ({
          id: d.document_id,
          filename: d.filename,
          fileType: d.file_type,
          status: d.status,
          pages: d.pages,
          chunksIndexed: d.chunks_indexed,
          uploadedAt: d.created_at,
          errorMessage: d.error_message,
        }))
        set({
          messages: formattedMessages,
          documents: formattedDocs,
          selectedDocumentIds: formattedDocs.filter((d) => d.status === 'ready').map((d) => d.id),
        })
      }
    } catch (e) {
      console.error('Failed to load session details', e)
    }
  },

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    }))
  },

  deleteSession: async (sessionId) => {
    try {
      await removeSession(sessionId)
    } catch (e) {
      console.error('Failed to delete session on backend', e)
    }
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== sessionId)
      const wasActive = state.activeSessionId === sessionId
      return {
        sessions: filtered,
        activeSessionId: wasActive ? null : state.activeSessionId,
        ...(wasActive ? { messages: [], documents: [], sources: [], selectedDocumentIds: [], isSourcePanelOpen: false } : {}),
      }
    })
  },

  // ─── Messages ───
  messages: [],

  addMessage: (message) => {
    const msg = {
      id: `msg_${generateId()}`,
      timestamp: new Date().toISOString(),
      sources: [],
      ...message,
    }
    set((state) => ({
      messages: [...state.messages, msg],
    }))
    return msg
  },

  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    }))
  },

  // ─── Documents ───
  documents: [],
  selectedDocumentIds: [],

  addDocument: (doc) => {
    set((state) => {
      const nextDocs = [...state.documents, doc]
      const nextSelected = doc.status === 'ready' && !state.selectedDocumentIds.includes(doc.id)
        ? [...state.selectedDocumentIds, doc.id]
        : state.selectedDocumentIds
      return {
        documents: nextDocs,
        selectedDocumentIds: nextSelected,
      }
    })
  },

  updateDocument: (docId, updates) => {
    set((state) => {
      const nextDocs = state.documents.map((d) =>
        d.id === docId ? { ...d, ...updates } : d
      )
      // If document becomes ready, automatically select it
      let nextSelected = state.selectedDocumentIds
      if (updates.status === 'ready' && !state.selectedDocumentIds.includes(docId)) {
        nextSelected = [...state.selectedDocumentIds, docId]
      }
      return {
        documents: nextDocs,
        selectedDocumentIds: nextSelected,
      }
    })
  },

  removeDocument: async (docId) => {
    try {
      await deleteDocument(docId)
    } catch (e) {
      console.error('Failed to delete document from backend', e)
    }
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== docId),
      selectedDocumentIds: state.selectedDocumentIds.filter((id) => id !== docId),
    }))
  },

  toggleSelectDocument: (docId) => {
    set((state) => {
      const exists = state.selectedDocumentIds.includes(docId)
      const nextSelected = exists
        ? state.selectedDocumentIds.filter((id) => id !== docId)
        : [...state.selectedDocumentIds, docId]
      return { selectedDocumentIds: nextSelected }
    })
  },

  selectAllDocuments: () => {
    set((state) => ({
      selectedDocumentIds: state.documents.filter((d) => d.status === 'ready').map((d) => d.id),
    }))
  },

  deselectAllDocuments: () => {
    set({ selectedDocumentIds: [] })
  },

  // ─── Sources ───
  sources: [],

  setSources: (newSources) => {
    // Always validate input
    const safe = Array.isArray(newSources) ? newSources : []
    set({ sources: safe })
  },
  clearSources: () => set({ sources: [] }),

  // ─── UI State ───
  isUploading: false,
  uploadProgress: 0,
  isQuerying: false,
  isSidebarOpen: true,
  isSourcePanelOpen: false,

  setUploadState: (isUploading, uploadProgress = 0) =>
    set({ isUploading, uploadProgress }),

  setQueryState: (isQuerying) => set({ isQuerying }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  toggleSourcePanel: () =>
    set((state) => ({ isSourcePanelOpen: !state.isSourcePanelOpen })),

  openSourcePanel: () => set({ isSourcePanelOpen: true }),
  closeSourcePanel: () => set({ isSourcePanelOpen: false }),
}))

export default useStore
