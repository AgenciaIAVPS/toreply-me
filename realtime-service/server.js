const express = require('express')
const app = express()
app.use(express.json())

const SECRET = process.env.BROADCAST_SECRET || 'change-me'
const clients = new Set()

// Browser conecta aqui via EventSource
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

// N8N chama aqui para broadcast
app.post('/broadcast', (req, res) => {
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const data = JSON.stringify(req.body)
  for (const client of clients) {
    client.write(`data: ${data}\n\n`)
  }
  res.json({ ok: true, clients: clients.size })
})

app.get('/health', (_, res) => res.json({ ok: true, clients: clients.size }))

app.listen(3000, () => console.log('SSE server listening on :3000'))
