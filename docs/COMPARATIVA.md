    
## Comparativa breve — STOMP vs Socket.IO**

- **STOMP (Spring Boot broker)**
	- Pros: Integración nativa con Spring (`/ws-blueprints` + `SimpleBroker`), patrón pub/sub estándar, el broker redistribuye a todos los suscriptores (incluido el emisor) y la lógica queda centralizada en el servidor.
	- Contras: depende del stack de Spring (menos flexible para personalizaciones en el gateway), requiere soporte STOMP en el servidor y puede tener más sobrecarga de protocolo frente a soluciones ligeras.

- **Socket.IO (Node.js gateway)**
	- Pros: API de cliente rica (reconexión automática, acknowledgements, fallbacks), alto control en el gateway (permite adaptar persistencia, validaciones y autorización), fácil de usar desde clientes JS.
	- Contras: implica un componente adicional (gateway) y un doble salto hacia la API REST (cliente → gateway → Spring), lo que añade complejidad operacional y puntos de fallo; la consistencia se debe garantizar explícitamente en el gateway.

**STOMP** cuando la arquitectura se apalanca en Spring y se prefiera un broker integrado  
**Socket.IO** cuando se necesite flexibilidad cliente-side, acknowledgements o lógica de gateway personalizada.   
En ambos casos el API REST es la fuente de verdad (persistencia) y el servidor debe garantizar que el blueprint enviado a clientes es la versión persistida.
