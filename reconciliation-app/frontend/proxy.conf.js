// Détection automatique de l'environnement backend
function getBackendTarget() {
  // Vérifier si une variable d'environnement est définie
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // Par défaut, utiliser HTTP sur le port 8080 (le backend démarre sur ce port)
  // Pour utiliser HTTPS sur 8443, le backend doit être démarré avec --spring.profiles.active=ssl
  // ou définir BACKEND_URL=https://localhost:8443
  return 'http://localhost:8080';
}

const backendTarget = getBackendTarget();
console.log('Proxy configuration: Backend target =', backendTarget);
console.log('Note: Le proxy utilise par défaut http://localhost:8080');
console.log('      Pour utiliser HTTPS sur 8443, définir BACKEND_URL=https://localhost:8443');
console.log('      et démarrer le backend avec --spring.profiles.active=ssl');

const PROXY_CONFIG = {
  "/api": {
    "target": backendTarget,
    "secure": backendTarget.startsWith('https'), // true pour HTTPS, false pour HTTP
    "changeOrigin": true,
    "logLevel": "info",
    "timeout": 1800000, // 30 minutes pour les gros fichiers (700k lignes)
    "proxyTimeout": 1800000,
    "rejectUnauthorized": false, // Accepter les certificats auto-signés pour localhost:8443
    "headers": {
      "Connection": "keep-alive"
    },
    // Optimisations pour améliorer les performances
    "ws": true, // Support WebSocket si nécessaire
    "xfwd": true, // Forward X-Forwarded-* headers
    "onError": function(err, req, res) {
      // Ignorer les erreurs ECONNRESET et ECONNREFUSED qui sont souvent bénignes
      // (connexions fermées par le client, annulation de requêtes, etc.)
      const benignErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'];
      
      if (benignErrors.includes(err.code)) {
        // Ne logger que si la réponse n'a pas encore été envoyée
        if (!res.headersSent && !res.writableEnded) {
          console.warn('[Proxy Warning]', err.code, 'for', req.url, '- Connection closed (likely benign)');
        }
        // Ne pas envoyer de réponse d'erreur si les headers ont déjà été envoyés
        if (res.headersSent || res.writableEnded) {
          return;
        }
      } else {
        // Pour les autres erreurs, logger normalement
        console.error('[Proxy Error]', err.code, err.message, 'for', req.url);
      }
      
      // Envoyer une réponse d'erreur uniquement si possible
      if (!res.headersSent && !res.writableEnded) {
        try {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            error: 'Proxy error',
            message: err.message,
            code: err.code
          }));
        } catch (writeErr) {
          // Ignorer les erreurs d'écriture si la connexion est déjà fermée
          console.warn('[Proxy] Could not send error response:', writeErr.message);
        }
      }
    },
    "onProxyReq": function(proxyReq, req, res) {
      proxyReq.setTimeout(1800000);
      
      // Gestion des erreurs de connexion au niveau de la requête proxy
      proxyReq.on('error', function(err) {
        // Ignorer les erreurs ECONNRESET bénignes
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
          console.error('[Proxy Request Error]', err.code, err.message, 'for', req.url);
        }
      });
      
      // Gestion des erreurs de réponse
      res.on('error', function(err) {
        // Ignorer les erreurs ECONNRESET bénignes
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
          console.error('[Proxy Response Error]', err.code, err.message, 'for', req.url);
        }
      });
      
      // Optimisations pour les requêtes de réconciliation
      if (req.url.includes('/reconcile')) {
        // Désactiver la compression pour les gros fichiers (déjà compressés côté backend)
        proxyReq.setHeader('Accept-Encoding', 'identity');
        // Augmenter les buffers pour les gros fichiers
        proxyReq.setHeader('Connection', 'keep-alive');
      }
      
      // Log uniquement pour les requêtes importantes
      if (req.url.includes('/reconcile') || req.url.includes('/upload')) {
        console.log('[Proxy]', req.method, req.url, '->', backendTarget + req.url);
      }
    },
    "onProxyRes": function(proxyRes, req, res) {
      // Ajouter les headers CORS si nécessaire
      if (!proxyRes.headers['access-control-allow-origin']) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    },
    "onClose": function(res, socket, head) {
      // Ne pas logger les fermetures normales de connexion
      // Les erreurs sont déjà gérées dans onError
    },
    // Gestion améliorée des erreurs de socket
    "onProxyReqWs": function(proxyReq, req, socket) {
      // Gestion des erreurs WebSocket
      socket.on('error', function(err) {
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
          console.error('[Proxy WebSocket Error]', err.code, err.message);
        }
      });
    }
  }
};

module.exports = PROXY_CONFIG;

