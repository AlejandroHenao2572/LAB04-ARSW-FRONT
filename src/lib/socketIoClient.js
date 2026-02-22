import { Client } from '@stomp/stompjs'

const WS_URL = `${(import.meta.env.VITE_STOMP_BASE ?? 'http://localhost:8080')
  .replace(/^http/, 'ws')}/ws-blueprints`
//  http://localhost:8080  →  ws://localhost:8080/ws-blueprints

// Fábrica del cliente STOMP 
// Devuelve un Client configurado pero SIN activar.
// La activación (client.activate()) la controla el hook useStompClient.
export function createStompClient() {
  return new Client({
    brokerURL:         WS_URL,
    reconnectDelay:    3000,      // reintenta si se cae la conexión
    heartbeatIncoming: 10000,     // el broker le manda un ping cada 10 s
    heartbeatOutgoing: 10000,     // el cliente le manda un ping al broker cada 10 s
    onStompError: (frame) => {
      console.error('[STOMP] Error:', frame.headers['message'])
    },
  })
}

// Suscripción a un plano específico
// Retorna el objeto Subscription. Para cancelar: subscription.unsubscribe()
// onMessage recibe el Blueprint completo (ya parseado) que llegó del broker.
export function subscribeToBlueprint(client, author, name, onMessage) {
  const topic = `/topic/blueprints.${author}.${name}`
  return client.subscribe(topic, (frame) => {
    const blueprint = JSON.parse(frame.body)
    onMessage(blueprint)
  })
}


// Publicación de un punto nuevo 
// El cliente envía al broker en /app/draw.
// Spring Boot lo recibe en @MessageMapping("/draw") y lo redistribuye.
export function publishPoint(client, author, name, point) {
  if (!client.connected) {
    console.warn('[STOMP] Intento de publicar sin conexión activa')
    return
  }
  client.publish({
    destination: '/app/draw',
    body: JSON.stringify({ author, name, point }),
  })
}