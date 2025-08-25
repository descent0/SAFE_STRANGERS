'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import SafetyModal from './components/SafetyModal'

export default function Home() {
  const router = useRouter();
  const [interests, setInterests] = useState([])
  const [newInterest, setNewInterest] = useState('')
  const [isMatching, setIsMatching] = useState(false)
  const [chatMode, setChatMode] = useState('video')
  const [safeMode, setSafeMode] = useState(false)
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Enhanced available interests (more comprehensive list)
  const availableInterests = [
    'Music', 'Movies', 'Gaming', 'Sports', 'Technology', 'Art', 'Books', 
    'Travel', 'Food', 'Photography', 'Fitness', 'Science', 'Politics',
    'Philosophy', 'Languages', 'Programming', 'Animals', 'Nature'
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Enhanced matching with safety modal system
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
      // Store preferences in browser storage
      sessionStorage.setItem('chatInterests', JSON.stringify(interests))
      sessionStorage.setItem('safeMode', safeMode.toString())
      
      const sessionId = uuidv4()
      // Simulate matching delay with better error handling
      await new Promise(resolve => setTimeout(resolve, 2000))
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
      icon: '🌍',
      title: 'Global Community',
      description: 'Connect with millions of users from around the world'
    },
    {
      icon: '⚡',
      title: 'Instant Connect',
      description: 'No waiting time - start chatting within seconds'
    },
    {
      icon: '🎭',
      title: 'Anonymous',
      description: 'Complete privacy protection - no personal data required'
    },
  ]

  const stats = [
    { number: '10M+', label: 'Active Users' },
    { number: '50+', label: 'Countries' },
    { number: '1M+', label: 'Daily Connections' },
    { number: '99.9%', label: 'Uptime' }
  ]

  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="text-4xl font-bold bg-contain">
                <img width="100px" src="/{AAAA2E79-65D5-4354-8E3E-66D83DA7DAF3}-Photoroom.png" alt="Safe stranger" />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-500 transition-colors font-medium">Features</a>
              <a href="#safety" className="text-gray-700 hover:text-blue-500 transition-colors font-medium">Safety</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-500 transition-colors font-medium">Contact</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Elegant Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-black/5"></div>
          {/* Subtle geometric shapes */}
          <div className="absolute top-20 left-20 w-64 h-64 border border-blue-200 rounded-full opacity-20"></div>
          <div className="absolute bottom-32 right-20 w-80 h-80 border border-black/10 rounded-full opacity-30"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-500/10 rounded-lg rotate-45 opacity-40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-white rounded-full border border-blue-200 shadow-sm mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></span>
              <span className="text-sm text-gray-700 font-medium">🔥 Connect with strangers safely</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="block text-black">Meet Amazing</span>
              <span className="block text-blue-500">
                Strangers Safely
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              Connect instantly with people worldwide through video, voice, or text. 
              AI-powered matching, complete anonymity, and industry-leading safety features.
            </p>
          </div>

          {/* Main Chat Setup Card */}
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xl">
              <div className="space-y-6">
                {/* Chat Mode Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Choose Your Experience
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { mode: 'video', icon: '🎥', label: 'Video' },
                      { mode: 'voice', icon: '🎙️', label: 'Voice' },
                      { mode: 'text', icon: '💬', label: 'Text' }
                    ].map(({ mode, icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => setChatMode(mode)}
                        className={`p-4 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                          chatMode === mode 
                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105' 
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="text-xl mb-1">{icon}</div>
                        <div>{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interests Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Your Interests <span className="text-gray-500 font-normal">(Optional - up to 5)</span>
                  </label>
                  
                  {/* Selected interests */}
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {interest}
                          <button
                            onClick={() => removeInterest(interest)}
                            className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Available interests - showing first 6 like Document 1 */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    {availableInterests.slice(0, 6).map((interest) => (
                      <button
                        key={interest}
                        onClick={() => addInterest(interest)}
                        disabled={interests.includes(interest) || interests.length >= 5}
                        className="px-3 py-2 text-xs bg-gray-50 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-gray-700 border border-gray-200 hover:border-blue-300 font-medium"
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom interest */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add custom interest..."
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
                      disabled={interests.length >= 5}
                    />
                    <button
                      onClick={addCustomInterest}
                      disabled={!newInterest.trim() || interests.length >= 5}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Safe Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      🛡️
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Safe Mode</div>
                      <div className="text-xs text-gray-600">Family-friendly content only</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safeMode}
                      onChange={(e) => setSafeMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 border-2 border-gray-300 peer-checked:border-green-500"></div>
                  </label>
                </div>

                {/* Start Button */}
                <button
                  onClick={startMatching}
                  disabled={isMatching}
                  className="w-full bg-black hover:bg-gray-800 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isMatching ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Finding Your Match...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">🎲</span>
                      Start {chatMode.charAt(0).toUpperCase() + chatMode.slice(1)} Chat
                    </div>
                  )}
                </button>
                
                <div className="text-xs text-gray-500 text-center">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-blue-500 hover:text-blue-600 underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-500 hover:text-blue-600 underline font-medium">Privacy Policy</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-blue-100 rounded-full border border-blue-200 mb-6">
              <span className="text-sm text-blue-700 font-semibold">✨ Why Choose SafeStranger</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Built for Safe & Fun Connections
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Experience the next generation of online social interaction with cutting-edge safety features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-xl hover:transform hover:scale-105"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
                  <span className="group-hover:grayscale group-hover:brightness-0 group-hover:invert transition-all duration-300">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-6 py-3 bg-green-100 rounded-full border border-green-200 mb-6">
                <span className="text-sm text-green-700 font-semibold">🛡️ Your Safety First</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
                Advanced Safety Features
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed font-medium">
                We've implemented industry-leading safety measures to ensure every conversation is secure, respectful, and enjoyable.
              </p>
              
              <div className="space-y-4">
                {[
                  'Real-time content moderation',
                  'Instant disconnection and reconnection',
                  'No personal data collection',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
                <div className="text-center">
                  <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                    <span className="text-white">🔒</span>
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">100% Anonymous</h3>
                  <p className="text-gray-600 mb-6 font-medium">
                    No registration required. No personal information stored. Complete privacy protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
            Ready to Meet Someone New?
          </h2>
         
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-500 hover:bg-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Chatting Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-black text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl font-bold">
                  <span className="text-white">Safe</span>
                  <span className="text-blue-400">Stranger</span>
                </div>
              </div>
              <p className="text-gray-300 mb-4 max-w-md font-medium">
                The safest way to meet strangers online. Connect with people worldwide through secure, anonymous conversations.
              </p>
              <div className="text-sm text-gray-400 font-medium">
                🔒 Anonymous • 🛡️ Safe • ⚡ Instant
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-300 text-sm font-medium">
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Video Chat</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Voice Calls</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Text Messaging</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Interest Matching</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Safety</h3>
              <ul className="space-y-2 text-gray-300 text-sm font-medium">
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Terms of Service</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Community Guidelines</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Report Issues</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm font-medium">
            <p>&copy; 2025 SafeStranger. All rights reserved. Made with ❤️ for safe connections.</p>
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