import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, mode = 'cloud' } = req.body

  try {
    if (mode === 'local') {
      // Route to local Ollama
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          messages,
          stream: false
        })
      })
      
      const data = await response.json()
      return res.status(200).json({ content: data.message.content })
    } else {
      // Use Vertex AI through AI Gateway
      const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'You are a real estate AI assistant for the RE Engine. Help with lead analysis, property recommendations, and communication strategies. Always provide professional, actionable advice.'
            },
            ...messages
          ],
          stream: false
        })
      })
      
      const data = await response.json()
      return res.status(200).json({ content: data.choices[0].message.content })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return res.status(500).json({ error: 'Failed to process AI request' })
  }
}
