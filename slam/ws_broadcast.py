import asyncio
import websockets
import threading
import json

active_clients = set()


def start_ws_server():
    async def handler(websocket):
        active_clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            active_clients.remove(websocket)

    async def server_loop():
        async with websockets.serve(handler, "127.0.0.1", 6789):
            print("🔌 Shared WebSocket server started on ws://127.0.0.1:6789")
            while True:
                await asyncio.sleep(1)

    threading.Thread(target=lambda: asyncio.run(server_loop()), daemon=True).start()


def broadcast(message_dict):
    async def _send():
        if not active_clients:
            return
        msg = json.dumps(message_dict)
        await asyncio.gather(*[ws.send(msg) for ws in active_clients])

    asyncio.run(_send())
