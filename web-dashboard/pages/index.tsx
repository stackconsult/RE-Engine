import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud')
  const [isLocalAvailable, setIsLocalAvailable] = useState(false)

  useEffect(() => {
    // Check if local Ollama is available
    fetch('http://localhost:11434/api/tags')
      .then(() => setIsLocalAvailable(true))
      .catch(() => setIsLocalAvailable(false))
  }, [])

  return (
    <>
      <Head>
        <title>RE Engine Dashboard</title>
        <meta name="description" content="Real Estate Engine Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">RE Engine</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">AI Mode:</label>
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value as 'cloud' | 'local')}
                    className="rounded border-gray-300 text-sm"
                    disabled={!isLocalAvailable && aiMode === 'cloud'}
                  >
                    <option value="cloud">Cloud (Vertex AI)</option>
                    <option value="local" disabled={!isLocalAvailable}>
                      Local (Ollama) {!isLocalAvailable && '- Not Available'}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  RE Engine Dashboard
                </h2>
                <p className="text-gray-600 mb-4">
                  Welcome to the Real Estate Engine Dashboard
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    Current AI Mode: <span className="font-semibold">{aiMode === 'cloud' ? 'Cloud (Vertex AI)' : 'Local (Ollama)'}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="text-green-600 font-semibold">Connected</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
