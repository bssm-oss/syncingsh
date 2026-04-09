import { WebSocketServer } from 'ws'
import http from 'http'
import * as map from 'lib0/map'

const wsReadyStateConnecting = 0
const wsReadyStateOpen = 1

const pingTimeout = 30000
const port = process.env.PORT || 4444

const wss = new WebSocketServer({ noServer: true })

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('ok')
})

/** @type {Map<string, Set<any>>} */
const topics = new Map()

const send = (conn, message) => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    conn.close()
  }
  try {
    conn.send(JSON.stringify(message))
  } catch {
    conn.close()
  }
}

const onconnection = (conn) => {
  const subscribedTopics = new Set()
  let closed = false
  let pongReceived = true

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close()
      clearInterval(pingInterval)
    } else {
      pongReceived = false
      try {
        conn.ping()
      } catch {
        conn.close()
      }
    }
  }, pingTimeout)

  conn.on('pong', () => { pongReceived = true })

  conn.on('close', () => {
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName) || new Set()
      subs.delete(conn)
      if (subs.size === 0) topics.delete(topicName)
    })
    subscribedTopics.clear()
    closed = true
  })

  conn.on('message', (message) => {
    if (typeof message === 'string' || message instanceof Buffer) {
      message = JSON.parse(message)
    }
    if (message && message.type && !closed) {
      switch (message.type) {
        case 'subscribe':
          ;(message.topics || []).forEach((topicName) => {
            if (typeof topicName === 'string') {
              const topic = map.setIfUndefined(topics, topicName, () => new Set())
              topic.add(conn)
              subscribedTopics.add(topicName)
            }
          })
          break
        case 'unsubscribe':
          ;(message.topics || []).forEach((topicName) => {
            const subs = topics.get(topicName)
            if (subs) subs.delete(conn)
          })
          break
        case 'publish':
          if (message.topic) {
            const receivers = topics.get(message.topic)
            if (receivers) {
              message.clients = receivers.size
              receivers.forEach((receiver) => send(receiver, message))
            }
          }
          break
        case 'ping':
          send(conn, { type: 'pong' })
      }
    }
  })
}

wss.on('connection', onconnection)

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

server.listen(port, () => {
  console.log(`Signaling server running on port ${port}`)
})
