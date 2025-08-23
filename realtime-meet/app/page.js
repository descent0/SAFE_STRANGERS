'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import SafetyModal from './components/SafetyModal'

export default function Home() {
  const [interests, setInterests] = useState([])
  const [newInterest, setNewInterest] = useState('')
  const [isMatching, setIsMatching] = useState(false)
  const [chatMode, setChatMode] = useState('video') // 'video', 'text', 'voice'
  const [safeMode, setSafeMode] = useState(false)
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const router = useRouter()

  const availableInterests = [
    'Music', 'Movies', 'Gaming', 'Sports', 'Technology', 'Art', 'Books', 
    'Travel', 'Food', 'Photography', 'Fitness', 'Science', 'Politics',
    'Philosophy', 'Languages', 'Programming', 'Animals', 'Nature'
  ]

  const addInterest = (interest) => {
    if (!interests.includes(interest) && interests.length < 5) {
      setInterests([...interests, interest])
    }
  }

  const removeInterest = (interest) => {
    setInterests(interests.filter(i => i !== interest))
  }

  const addCustomInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest) && interests.length < 5) {
      setInterests([...interests, newInterest.trim()])
      setNewInterest('')
    }
  }

  const startMatching = async () => {
    // Check if user has accepted safety guidelines
    const hasAcceptedSafety = localStorage.getItem('acceptedSafetyGuidelines')
    if (!hasAcceptedSafety) {
      setShowSafetyModal(true)
      return
    }
    
    await proceedWithMatching()
  }

  const proceedWithMatching = async () => {
    setIsMatching(true)
    
    try {
      // Store preferences in sessionStorage for the chat page
      sessionStorage.setItem('chatInterests', JSON.stringify(interests))
      sessionStorage.setItem('safeMode', safeMode.toString())
      
      // Generate a session ID and navigate directly to chat
      const sessionId = uuidv4()
      router.push(`/chat?sessionId=${sessionId}&mode=${chatMode}`)
    } catch (error) {
      console.error('Error starting matching:', error)
      alert('Failed to start matching. Please try again.')
    } finally {
      setIsMatching(false)
    }
  }

  const handleAcceptSafety = () => {
    localStorage.setItem('acceptedSafetyGuidelines', 'true')
    setShowSafetyModal(false)
    proceedWithMatching()
  }

  const features = [
    {
      icon: '�',
      title: 'Random Matching',
      description: 'Connect with strangers from around the world instantly'
    },
    {
      icon: '�️',
      title: 'Interest-Based Chat',
      description: 'Find people who share your interests and hobbies'
    },
    {
      icon: '�',
      title: 'Anonymous & Safe',
      description: 'Chat anonymously with built-in safety features'
    },
    {
      icon: '⏭️',
      title: 'Skip & Next',
      description: 'Not clicking? Skip to the next person instantly'
    },
    {
      icon: '🎭',
      title: 'Virtual Effects',
      description: 'Use face filters and virtual backgrounds'
    },
    {
      icon: '🌍',
      title: 'Multi-Language',
      description: 'Chat with people in different languages'
    },
    {
      icon: '📱',
      title: 'Multiple Modes',
      description: 'Video, voice-only, or text-only chat options'
    },
    {
      icon: '�️',
      title: 'Smart Moderation',
      description: 'AI-powered content filtering for safer chats'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Meet</span>{' '}
                  <span className="block text-indigo-600 xl:inline">Random Strangers</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Connect instantly with people worldwide. Video chat, voice calls, or text messaging - 
                  all anonymous and safe. Find people who share your interests or explore new perspectives.
                </p>
                
                {/* Main CTA Form */}
                <div className="mt-8 bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto lg:mx-0">
                  <div className="space-y-4">
                    {/* Chat Mode Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chat Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setChatMode('video')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                            chatMode === 'video' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          🎥 Video
                        </button>
                        <button
                          onClick={() => setChatMode('voice')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                            chatMode === 'voice' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          🎙️ Voice
                        </button>
                        <button
                          onClick={() => setChatMode('text')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                            chatMode === 'text' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          💬 Text
                        </button>
                      </div>
                    </div>

                    {/* Interests Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Interests (Optional - up to 5)
                      </label>
                      
                      {/* Selected interests */}
                      {interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {interests.map((interest) => (
                            <span
                              key={interest}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {interest}
                              <button
                                onClick={() => removeInterest(interest)}
                                className="ml-1 text-indigo-600 hover:text-indigo-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Available interests */}
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        {availableInterests.slice(0, 6).map((interest) => (
                          <button
                            key={interest}
                            onClick={() => addInterest(interest)}
                            disabled={interests.includes(interest) || interests.length >= 5}
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom interest */}
                      <div className="flex space-x-1 mt-2">
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Add custom interest"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          disabled={interests.length >= 5}
                        />
                        <button
                          onClick={addCustomInterest}
                          disabled={!newInterest.trim() || interests.length >= 5}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Safe Mode Toggle */}
                    <div className="flex items-center">
                      <input
                        id="safeMode"
                        type="checkbox"
                        checked={safeMode}
                        onChange={(e) => setSafeMode(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="safeMode" className="ml-2 block text-sm text-gray-700">
                        🛡️ Safe Mode (Family-friendly)
                      </label>
                    </div>

                    <button
                      onClick={startMatching}
                      disabled={isMatching}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 font-medium text-lg disabled:opacity-50"
                    >
                      {isMatching ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Finding Someone...
                        </div>
                      ) : (
                        `🎲 Start ${chatMode.charAt(0).toUpperCase() + chatMode.slice(1)} Chat`
                      )}
                    </button>
                    
                    <div className="text-xs text-gray-500 text-center">
                      By starting a chat, you agree to our{' '}
                      <a href="#" className="text-indigo-600 hover:text-indigo-800">Community Guidelines</a>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">�</div>
              <h3 className="text-2xl font-bold">Anonymous Chat</h3>
              <p className="text-lg opacity-90">Connect with strangers worldwide</p>
              <div className="mt-4 text-sm opacity-75">
                <div>🔒 Anonymous & Secure</div>
                <div>🎯 Interest-based Matching</div>
                <div>⚡ Instant Connections</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Connect with strangers, make new friends
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Experience the thrill of meeting new people from around the world. Safe, anonymous, and fun conversations await.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-md bg-indigo-500 text-white mx-auto mb-4 text-2xl">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Safe & Secure Platform</h2>
            <p className="mt-4 text-xl text-gray-600">Built with privacy and safety as our top priorities</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-1 flex justify-center md:col-span-1">
              <div className="text-center">
                <div className="text-4xl mb-2">🔒</div>
                <div className="text-sm font-medium text-gray-900">End-to-End Encrypted</div>
              </div>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1">
              <div className="text-center">
                <div className="text-4xl mb-2">🤖</div>
                <div className="text-sm font-medium text-gray-900">AI Moderation</div>
              </div>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1">
              <div className="text-center">
                <div className="text-4xl mb-2">🚫</div>
                <div className="text-sm font-medium text-gray-900">No Data Storage</div>
              </div>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1">
              <div className="text-center">
                <div className="text-4xl mb-2">🛡️</div>
                <div className="text-sm font-medium text-gray-900">Safe Mode Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white">Anonymous Chat</h3>
            <p className="mt-2 text-gray-400">Safe, fun, and instant connections</p>
            <div className="mt-4 text-sm text-gray-500">
              Connect anonymously • Skip freely • Stay safe
            </div>
          </div>
        </div>
      </footer>

      {/* Safety Modal */}
      <SafetyModal
        isVisible={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        onAccept={handleAcceptSafety}
      />
    </div>
  )
}
