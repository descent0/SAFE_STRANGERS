'use client'

import { useState } from 'react'

export default function SafetyModal({ isVisible, onClose, onAccept }) {
  const [hasRead, setHasRead] = useState(false)

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🛡️ Safety Guidelines & Community Rules</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-lg font-semibold text-red-600 mb-3">🚫 Prohibited Content & Behavior</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>No nudity or sexual content</strong> - This includes partial nudity, suggestive poses, or sexually explicit material</li>
                <li>• <strong>No harassment or bullying</strong> - Respect others and treat them with kindness</li>
                <li>• <strong>No hate speech</strong> - Content targeting race, religion, gender, sexuality, or other characteristics</li>
                <li>• <strong>No violence or threats</strong> - Including threats of self-harm or harm to others</li>
                <li>• <strong>No illegal activities</strong> - Don't discuss or promote illegal activities</li>
                <li>• <strong>No spam or commercial content</strong> - Don't advertise products or services</li>
                <li>• <strong>No minors (under 18)</strong> - This platform is for adults only</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-green-600 mb-3">✅ Best Practices for Safe Chatting</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Keep personal information private</strong> - Never share your real name, address, phone number, or social media</li>
                <li>• <strong>Use the skip button freely</strong> - If you feel uncomfortable, skip to the next person immediately</li>
                <li>• <strong>Report inappropriate behavior</strong> - Help keep the community safe by reporting violations</li>
                <li>• <strong>Be respectful and kind</strong> - Treat others as you'd like to be treated</li>
                <li>• <strong>End conversations gracefully</strong> - If you need to leave, say goodbye politely</li>
                <li>• <strong>Trust your instincts</strong> - If something feels wrong, disconnect immediately</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-blue-600 mb-3">🔒 Privacy & Security</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>All chats are anonymous</strong> - We don't store personal information or chat history</li>
                <li>• <strong>Conversations are not recorded</strong> - Your video and audio calls are peer-to-peer</li>
                <li>• <strong>Use strong device security</strong> - Ensure your device is secure and up-to-date</li>
                <li>• <strong>Be aware of screen recording</strong> - Others might record conversations, so be cautious</li>
                <li>• <strong>Control your camera and microphone</strong> - You can mute or disable them anytime</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-purple-600 mb-3">🆘 Getting Help</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Emergency situations</strong> - Contact local emergency services (911, 999, etc.)</li>
                <li>• <strong>Report users</strong> - Use the report button to flag inappropriate behavior</li>
                <li>• <strong>Block users</strong> - Prevent specific users from contacting you again</li>
                <li>• <strong>Mental health resources</strong> - If you're struggling, reach out to mental health professionals</li>
              </ul>
            </section>

            <section className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Important Reminders</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>• This is a public platform with strangers from around the world</li>
                <li>• Not everyone has good intentions - stay vigilant</li>
                <li>• Screenshots and recordings are possible - assume nothing is private</li>
                <li>• Report any suspicious or inappropriate behavior immediately</li>
                <li>• When in doubt, disconnect and find a new chat partner</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasRead}
                onChange={(e) => setHasRead(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                I have read and understand the safety guidelines and community rules
              </span>
            </label>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (hasRead) {
                    onAccept()
                  }
                }}
                disabled={!hasRead}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
