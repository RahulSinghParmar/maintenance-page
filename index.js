// Replace this with your exact GitHub Raw URL from Step 1
const GITHUB_MAINTENANCE_RAW_URL = "https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/main/parmar_homes_maintenance_page.html";

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(request);

      // If the home server/tunnel returns an offline error
      if ([502, 503, 522, 523, 524].includes(response.status)) {
        return await serveMaintenancePage(request, ctx);
      }

      return response;
    } catch (err) {
      // Direct network error (cloudflared offline/unreachable)
      return await serveMaintenancePage(request, ctx);
    }
  }
};

async function serveMaintenancePage(request, ctx) {
  let htmlContent = null;

  try {
    // Fetch HTML from GitHub Raw with Cloudflare Edge Caching (5 mins)
    const githubResponse = await fetch(GITHUB_MAINTENANCE_RAW_URL, {
      cf: {
        cacheTtl: 300,        // Cache HTML at edge for 300 seconds (5 mins)
        cacheEverything: true
      }
    });

    if (githubResponse.ok) {
      htmlContent = await githubResponse.text();
    }
  } catch (e) {
    console.error("Failed to fetch maintenance HTML from GitHub Raw:", e);
  }

  // Fallback HTML if GitHub API fails
  if (!htmlContent) {
    htmlContent = getFallbackHTML();
  }

  return new Response(htmlContent, {
    status: 503, // Informs crawlers that downtime is temporary
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "retry-after": "30", // Asks clients to retry in 30 seconds
      "cache-control": "no-cache, no-store, must-revalidate"
    }
  });
}

// Emergency Fallback Page (Only used if GitHub Raw is down)
function getFallbackHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>parmar.homes | Scheduled Maintenance</title>
<style>
  body{font-family:Segoe UI,sans-serif;background:#0d1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;text-align:center;max-width:450px}
</style>
</head>
<body>
  <div class="card">
    <h2>⚙️ System Maintenance</h2>
    <p>parmar.homes services are temporarily offline for updates. Automatic retry in progress...</p>
  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}