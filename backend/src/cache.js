const liveClients = new Set();

function broadcastLiveUpdate(type = 'reload', detail = {}) {
  const payload = `event: ${type}\ndata: ${JSON.stringify({ type, detail, ts: Date.now() })}\n\n`;
  for (const client of liveClients) {
    try {
      client.write(payload);
    } catch {
      liveClients.delete(client);
    }
  }
}

module.exports = { liveClients, broadcastLiveUpdate };
