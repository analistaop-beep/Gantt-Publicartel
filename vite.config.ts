import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function devEmailPlugin(): Plugin {
  return {
    name: 'dev-email-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send-email', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Método no permitido' }));
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          const sendJson = (code: number, data: Record<string, unknown>) => {
            res.statusCode = code;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };

          try {
            const parsed = body ? JSON.parse(body) : {};

            // Cargar variables de entorno desde .env y .env.local
            const env = loadEnv(server.config.mode, process.cwd(), '');
            Object.assign(process.env, env);

            // Validar auth
            const authHeader = req.headers.authorization;
            if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
              return sendJson(401, { error: 'Se requiere token de autorización' });
            }

            const token = String(authHeader).split(' ')[1];
            const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
              return sendJson(500, { error: 'Configuración de Supabase faltante' });
            }

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error: authError } = await supabase.auth.getUser(token);
            if (authError) {
              return sendJson(401, { error: 'Token inválido' });
            }

            // Validar params
            const { to, subject, html, text } = parsed;
            if (!to || !subject || (!html && !text)) {
              return sendJson(400, { error: 'Faltan parámetros requeridos (to, subject, html/text)' });
            }

            const gmailUser = (env.GMAIL_USER || process.env.GMAIL_USER || '').trim();
            const gmailPass = (env.GMAIL_PASS || process.env.GMAIL_PASS || '').trim().replace(/\s+/g, '');

            if (!gmailUser || !gmailPass) {
              return sendJson(500, { error: 'GMAIL_USER / GMAIL_PASS no configuradas en .env.local' });
            }

            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
              service: 'gmail',
              auth: { user: gmailUser, pass: gmailPass },
              connectionTimeout: 10000,
              greetingTimeout: 5000,
              socketTimeout: 15000,
            });

            const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
            if (recipients.length === 0) {
              return sendJson(400, { error: 'Lista de destinatarios vacía' });
            }

            const info = await transporter.sendMail({
              from: `"Gantt Publicartel" <${gmailUser}>`,
              to: recipients.length === 1 ? recipients[0] : gmailUser,
              bcc: recipients.length > 1 ? recipients.join(', ') : undefined,
              subject,
              text,
              html,
            });

            sendJson(200, { success: true, messageId: info.messageId });
          } catch (err: unknown) {
            const error = err as Error & { code?: string };
            console.error('devEmailPlugin error:', error);
            let errorMsg = error.message || 'Error desconocido';
            if (error.code === 'EAUTH' || errorMsg.includes('Invalid login') || errorMsg.includes('535')) {
              errorMsg = 'Error de autenticación en Gmail. Verifica GMAIL_USER y GMAIL_PASS (debe ser una Contraseña de Aplicación de 16 caracteres).';
            }
            sendJson(500, { error: errorMsg, code: error.code });
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devEmailPlugin()],
  server: {
    allowedHosts: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js', 'zustand']
        }
      }
    }
  }
})
