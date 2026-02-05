import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud')
  const [isLocalAvailable, setIsLocalAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [systemStatus, setSystemStatus] = useState({
    engine: 'checking',
    whatsapp: 'checking',
    ai: 'checking'
  })

  useEffect(() => {
    // Check if local Ollama is available
    fetch('http://localhost:11434/api/tags')
      .then(() => setIsLocalAvailable(true))
      .catch(() => setIsLocalAvailable(false))

    // Check system status
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/engine/status')
      const status = await response.json()
      setSystemStatus(status)
    } catch (error) {
      setSystemStatus({
        engine: 'offline',
        whatsapp: 'offline', 
        ai: 'offline'
      })
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    
    setIsLoading(true)
    const userMessage = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          mode: aiMode
        })
      })
      
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'checking': return 'bg-yellow-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <>
      <Head>
        <title>RE Engine Dashboard</title>
        <meta name="description" content="Real Estate Engine Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">RE</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">RE Engine</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                {/* AI Mode Toggle */}
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-gray-700">AI Mode:</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-300">
                    <button
                      onClick={() => setAiMode('cloud')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        aiMode === 'cloud' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cloud (Vertex AI)
                    </button>
                    <button
                      onClick={() => setAiMode('local')}
                      disabled={!isLocalAvailable}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-l ${
                        aiMode === 'local' 
                          ? 'bg-blue-600 text-white' 
                          : isLocalAvailable
                            ? 'bg-white text-gray-700 hover:bg-gray-50'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Local (Ollama)
                      {!isLocalAvailable && ' - Unavailable'}
                    </button>
                  </div>
                </div>

                {/* System Status */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus.engine)}`}></div>
                    <span className="text-sm text-gray-600">Engine</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus.whatsapp)}`}></div>
                    <span className="text-sm text-gray-600">WhatsApp</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus.ai)}`}></div>
                    <span className="text-sm text-gray-600">AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {isLoading ? 'Thinking...' : 'Online'}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium mb-2">Start a conversation</p>
                      <p className="text-sm">Ask me anything about real estate, lead management, or property analysis.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about properties, leads, or real estate strategies..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left">
                    <div className="font-medium">Analyze New Lead</div>
                    <div className="text-sm opacity-75">AI-powered lead scoring</div>
                  </button>
                  <button className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left">
                    <div className="font-medium">Property Matching</div>
                    <div className="text-sm opacity-75">Find perfect properties</div>
                  </button>
                  <button className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left">
                    <div className="font-medium">Market Analysis</div>
                    <div className="text-sm opacity-75">Real-time market insights</div>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Activity</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">New Leads</span>
                    <span className="text-2xl font-bold text-blue-600">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Messages Sent</span>
                    <span className="text-2xl font-bold text-green-600">48</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="text-2xl font-bold text-purple-600">24%</span>
                  </div>
                </div>
              </div>

              {/* AI Mode Info */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Current AI Mode</h3>
                <div className="text-2xl font-bold mb-2">
                  {aiMode === 'cloud' ? '☁️ Cloud (Vertex AI)' : '🏠 Local (Ollama)'}
                </div>
                <p className="text-sm opacity-90">
                  {aiMode === 'cloud' 
                    ? 'Using Google\'s Vertex AI for advanced real estate analysis'
                    : 'Using local Ollama for private, cost-effective processing'
                  }
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
