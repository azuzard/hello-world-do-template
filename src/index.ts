import { DurableObject } from 'cloudflare:workers'
import crossws from "crossws/adapters/cloudflare"

const ws = crossws({
    // bindingName: "$DurableObject",
    // instanceName: "crossws",
    hooks: {
        message(peer, message) {
            const data = message.json() as { topic?: string, message?: string }
            // Subscribe to topic if specified in message
            if (data?.topic) {
                peer.subscribe(data.topic)
                console.log(`✅ Subscribed to topic: ${data.topic}`)
            }
            // Publish message to topic
            if (data?.topic && data?.message) {
                peer.publish(data.topic, data)
            }
        },
        open(peer) {
            peer.send("Welcome to the WebSocket server!")
        },
        close(peer, details) {
            peer.topics.forEach(topic => peer.publish(topic, { user: "server", message: `${peer} left!` }))
            peer.close()
        },
        error(peer, error) {
            console.error("WebSocket error:", error)
        }
    },
})

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.url.includes("/websocket") && request.headers.get("upgrade") === "websocket") {
            return ws.handleUpgrade(request, env, ctx)
        }
        return new Response(
            "To use: { \"topic\": \"chat\", \"message\": \"Hello from client!\" }",
            { headers: { "content-type": "text/html" } },
        )
    },
}

export class $DurableObject extends DurableObject {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        ws.handleDurableInit(this, ctx, env)
    }

    fetch(request: Request) {
        return ws.handleDurableUpgrade(this, request)
    }

    webSocketMessage(client: WebSocket, message: string) {
        return ws.handleDurableMessage(this, client, message)
    }

    webSocketPublish(topic: string, message: string, opts: any) {
        return ws.handleDurablePublish(this, topic, message, opts)
    }

    webSocketClose(client: WebSocket, code: number, reason: string, wasClean: boolean) {
        return ws.handleDurableClose(this, client, code, reason, wasClean)
    }
}