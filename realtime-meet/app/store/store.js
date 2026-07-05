import { configureStore } from '@reduxjs/toolkit'
import chatReducer from './slice/chatSlice'

export const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
})