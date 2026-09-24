const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

function proxyFor(prefix, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => prefix + path,
  });
}

const routes = {
  '/api/users': 'https://mediastream-user.onrender.com',
  '/api/catalog': 'https://mediastream-catalog.onrender.com',
  '/api/playback': 'https://mediastream-playback.onrender.com',
  '/api/media': 'https://mediastream-media.onrender.com',
  '/api/recommendations': 'https://mediastream-recommendation.onrender.com',
  '/api/billing': 'https://mediastream-billing.onrender.com',
};

for (const [prefix, target] of Object.entries(routes)) {
  app.use(prefix, proxyFor(prefix, target));
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.send(`<html><body style="font-family:sans-serif;background:#0d0d12;color:#eee;padding:40px">
  <h1>MediaStream API Gateway</h1>
  <p>Único punto de entrada para el Cliente (sección 5 del documento de arquitectura).</p>
  <ul>
    <li>/api/users/*</li>
    <li>/api/catalog/*</li>
    <li>/api/playback/*</li>
    <li>/api/media/*</li>
    <li>/api/recommendations/*</li>
    <li>/api/billing/*</li>
  </ul>
  <p>Consolas de administración de cada servicio:</p>
  <ul>
    <li><a href="https://mediastream-user.onrender.com" style="color:#a393e6">User</a></li>
    <li><a href="https://mediastream-catalog.onrender.com" style="color:#d6a756">Catalog</a></li>
    <li><a href="https://mediastream-playback.onrender.com" style="color:#6aa9e0">Playback</a></li>
    <li><a href="https://mediastream-media.onrender.com" style="color:#de8fae">Media Processing</a></li>
    <li><a href="https://mediastream-recommendation.onrender.com" style="color:#5cc2b4">Recommendation</a></li>
    <li><a href="https://mediastream-billing.onrender.com" style="color:#b9cc63">Billing</a></li>
  </ul>
  </body></html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Gateway escuchando en el puerto ${port}`));
