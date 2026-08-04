export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(request);

      // Intercept Cloudflare / Origin downtime status codes (502, 503, 522, 523, 524)
      if ([502, 503, 522, 523, 524].includes(response.status)) {
        return serveMaintenancePage();
      }

      return response;
    } catch (err) {
      // If the cloudflared tunnel is completely disconnected/offline
      return serveMaintenancePage();
    }
  }
};

function serveMaintenancePage() {
  return new Response(MAINTENANCE_HTML, {
    status: 503, // Informs search engines & crawlers that downtime is temporary
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "retry-after": "30",
      "cache-control": "no-cache, no-store, must-revalidate"
    }
  });
}

// ----------------------------------------------------------------------
// PARMAR.HOMES MAINTENANCE HTML TEMPLATE
// ----------------------------------------------------------------------
const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>parmar.homes | Scheduled Maintenance</title>
  
  <style>
    /* --- CSS Variables --- */
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --warn: #d29922;
      --ok: #3fb950;
      --down: #f85149;
    }

    /* --- Global Reset --- */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(180deg, var(--bg), #111827);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }

    /* --- Layout & Cards --- */
    .card {
      max-width: 760px;
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 42px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    }

    .header {
      text-align: center;
    }

    .gear {
      font-size: 58px;
      display: inline-block;
      animation: spin 8s linear infinite;
    }

    /* --- Typography --- */
    h1 {
      margin: 16px 0 10px;
      font-size: 2rem;
    }

    p {
      color: var(--muted);
      line-height: 1.7;
    }

    /* --- Data Table --- */
    .status {
      margin: 28px 0;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    .status table {
      width: 100%;
      border-collapse: collapse;
    }

    .status th, 
    .status td {
      padding: 12px 16px;
      text-align: left;
    }

    .status th {
      background: #1f2937;
    }

    .status tr:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }

    /* --- Status Colors --- */
    .ok   { color: var(--ok); }
    .warn { color: var(--warn); }
    .down { color: var(--down); }

    /* --- Info & Badges --- */
    .info {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin: 20px 0;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .badge {
      display: inline-block;
      background: rgba(210, 153, 34, 0.15);
      color: var(--warn);
      padding: 10px 18px;
      border-radius: 999px;
      border: 1px solid rgba(210, 153, 34, 0.4);
      font-weight: 500;
    }

    /* --- Buttons --- */
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 26px;
    }

    .btn {
      padding: 12px 22px;
      text-decoration: none;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #21262d;
      color: var(--text);
      transition: 0.2s ease;
    }

    .btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* --- Footer --- */
    footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: #6e7681;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    /* --- Animations --- */
    @keyframes spin {
      from { transform: rotate(0); }
      to   { transform: rotate(360deg); }
    }
  </style>
</head>

<body>
  <div class="card">
    
    <div class="header">
      <div class="gear">⚙️</div>
      <h1>Scheduled Maintenance</h1>
      <p>The requested service is temporarily unavailable while infrastructure maintenance is in progress. Services will automatically become available once deployment and health checks are complete.</p>
    </div>

    <div class="info">
      <div><strong>Environment:</strong> Production</div>
      <div><strong>Version:</strong> v2.0.0</div>
      <div><strong>Local Time:</strong> <span id="clock"></span></div>
    </div>

    <div class="status">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Infrastructure</td>
            <td class="ok">● Online</td>
          </tr>
          <tr>
            <td>Docker Containers</td>
            <td class="warn">● Restarting</td>
          </tr>
          <tr>
            <td>Reverse Proxy</td>
            <td class="warn">● Reloading</td>
          </tr>
          <tr>
            <td>Public Services</td>
            <td class="down">● Temporarily Offline</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="text-align: center;">
      <div class="badge">Automatic retry in <span id="count">30</span> seconds</div>
    </div>

    <div class="actions">
      <a class="btn" href="mailto:rahulsinghparmar4@protonmail.com?subject=parmar.homes%20Support">📧 Contact Support</a>
      <a class="btn" href="#" onclick="location.reload(); return false;">🔄 Refresh Now</a>
    </div>

    <footer>
      <strong>parmar.homes</strong><br>
      Rahul Singh Parmar • Self-Hosted Infrastructure<br>
      Last Updated: <span id="updated"></span>
    </footer>
    
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      document.getElementById('clock').textContent = now.toLocaleString();
    }
    
    updateClock();
    setInterval(updateClock, 1000);
    
    document.getElementById('updated').textContent = new Date().toLocaleString();
    
    let secondsRemaining = 30;
    const countdownElement = document.getElementById('count');
    
    const countdownTimer = setInterval(() => {
      secondsRemaining--;
      countdownElement.textContent = secondsRemaining;
      
      if (secondsRemaining <= 0) {
        clearInterval(countdownTimer);
        location.reload();
      }
    }, 1000);
  </script>
</body>
</html>`;