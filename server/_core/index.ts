import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { credentialRemindersHandler } from "../scheduledReminders";
import { retentionCleanupHandler } from "../scheduledRetentionCleanup";
import { pilotLifecycleHandler } from "../scheduledPilotLifecycle";
import { privacyPolicyReviewHandler } from "../scheduledPrivacyPolicyReview";
import { deletionDeadlineAlertHandler } from "../scheduledDeletionDeadlineAlert";
import { oigBatchCheckHandler } from "../scheduledOigBatchCheck";
import { handleWebhookEvent } from "../billing";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1); // Required for correct req.protocol/req.secure detection behind a reverse proxy
  const server = createServer(app);

  // ── Security headers via Helmet.js ──────────────────────────────────────────
  // Applied before all routes so every response gets the headers.
  // CSP is configured to allow Manus OAuth, Stripe, Google Fonts, and the
  // app's own assets. Adjust trusted domains as new integrations are added.
  app.use(
    helmet({
      // Content-Security-Policy: restrict what the browser can load
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",   // Required for Vite HMR in dev; tighten in prod with nonces
            "'unsafe-eval'",     // Required for Vite dev server
            "https://js.stripe.com",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",   // Required for Tailwind CSS-in-JS
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",            // Allow all HTTPS images (CDN assets, storage)
          ],
          connectSrc: [
            "'self'",
            "https://api.manus.im",
            "https://*.manus.space",
            "https://api.stripe.com",
            "wss:",              // WebSocket for Vite HMR
            "ws:",
          ],
          frameSrc: [
            "https://js.stripe.com",
            "https://hooks.stripe.com",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      // X-Frame-Options: prevent clickjacking (deny embedding in iframes)
      frameguard: { action: "deny" },
      // X-Content-Type-Options: prevent MIME sniffing
      noSniff: true,
      // X-XSS-Protection: legacy XSS filter for older browsers
      xssFilter: true,
      // Referrer-Policy: don't leak full URL in referrer headers
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      // Strict-Transport-Security: force HTTPS for 1 year (production only)
      hsts: process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Remove X-Powered-By: don't advertise Express
      hidePoweredBy: true,
      // Permissions-Policy: disable unused browser features
      // (Helmet 8 uses permittedCrossDomainPolicies for cross-domain; permissions handled separately)
      crossOriginEmbedderPolicy: false, // Disabled: breaks CDN image loading
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CDN assets
    })
  );

  // ── Stripe Webhook — must be registered BEFORE the JSON body parser ──
  // Stripe requires the raw request body for signature verification.
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") {
        res.status(400).send("Missing stripe-signature header");
        return;
      }
      try {
        await handleWebhookEvent(req.body as Buffer, signature);
        res.json({ received: true });
      } catch (err) {
        console.error("[Stripe Webhook] Error:", err);
        res.status(400).send(err instanceof Error ? err.message : "Webhook error");
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Scheduled handlers — must be mounted before Vite/static fallthrough
  app.post("/api/scheduled/credential-reminders", credentialRemindersHandler);
  app.post("/api/scheduled/retention-cleanup", retentionCleanupHandler);
  app.post("/api/scheduled/pilot-lifecycle", pilotLifecycleHandler);
  app.post("/api/scheduled/privacy-policy-review", privacyPolicyReviewHandler);
  app.post("/api/scheduled/deletion-deadline-alert", deletionDeadlineAlertHandler);
  app.post("/api/scheduled/oig-batch-check", oigBatchCheckHandler);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
