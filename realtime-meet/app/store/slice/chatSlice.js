import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Matching
  partner: null,
  partnerSessionId: null,
  queuePosition: null,

  // Connection
  connectionStatus: 'disconnected',

  // Chat
  messages: [],
  partnerTyping: false,

  // Reactions
  reactions: [],

  // Settings
  safeMode: false,
}

const chatSlice = createSlice({
  name: 'chat',

  initialState,

  reducers: {
    // -------------------------
    // Partner
    // -------------------------

    setPartner: (state, action) => {
      state.partner = action.payload
    },

    clearPartner: (state) => {
      state.partner = null
      state.partnerSessionId = null
    },

    setPartnerSessionId: (state, action) => {
      state.partnerSessionId = action.payload
    },

    // -------------------------
    // Queue
    // -------------------------

    setQueuePosition: (state, action) => {
      state.queuePosition = action.payload
    },

    // -------------------------
    // Connection
    // -------------------------

    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload
    },

    // -------------------------
    // Messages
    // -------------------------

    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },

    setMessages: (state, action) => {
      state.messages = action.payload
    },

    clearMessages: (state) => {
      state.messages = []
    },

    // -------------------------
    // Typing
    // -------------------------

    setPartnerTyping: (state, action) => {
      state.partnerTyping = action.payload
    },

    // -------------------------
    // Reactions
    // -------------------------

    addReaction: (state, action) => {
      state.reactions.push(action.payload)
    },

    removeReaction: (state, action) => {
      state.reactions = state.reactions.filter(
        reaction => reaction.id !== action.payload
      )
    },

    clearReactions: (state) => {
      state.reactions = []
    },

    // -------------------------
    // Settings
    // -------------------------

    setSafeMode: (state, action) => {
      state.safeMode = action.payload
    },

    // -------------------------
    // Full Reset
    // -------------------------

    clearChatState: (state) => {
      state.partner = null
      state.partnerSessionId = null
      state.queuePosition = null

      state.messages = []
      state.partnerTyping = false
      state.reactions = []

      state.connectionStatus = 'disconnected'
    },
  },
})

export const {
  // Partner
  setPartner,
  clearPartner,
  setPartnerSessionId,

  // Queue
  setQueuePosition,

  // Connection
  setConnectionStatus,

  // Messages
  addMessage,
  setMessages,
  clearMessages,

  // Typing
  setPartnerTyping,

  // Reactions
  addReaction,
  removeReaction,
  clearReactions,

  // Settings
  setSafeMode,

  // Reset
  clearChatState,
} = chatSlice.actions

export default chatSlice.reducer