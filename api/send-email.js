import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Enable CORS for API requests
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' });
    }

    // 1. Validar Token de Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Se requiere token de autorización' });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Configuración de Supabase faltante en el servidor' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Acceso no autorizado: Token inválido' });
    }

    // 2. Extraer parámetros del correo
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (to, subject, html/text)' });
    }

    const gmailUser = (process.env.GMAIL_USER || '').trim();
    const rawGmailPass = (process.env.GMAIL_PASS || '').trim();
    // Eliminar espacios comunes generados por Google en contraseñas de app (ej: "abcd efgh ijkl mnop")
    const gmailPass = rawGmailPass.replace(/\s+/g, '');

    if (!gmailUser || !gmailPass) {
        return res.status(500).json({ 
            error: 'Credenciales de Gmail (GMAIL_USER / GMAIL_PASS) no configuradas en el servidor.' 
        });
    }

    // 3. Configurar transporte de Nodemailer usando Gmail SMTP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
    });

    try {
        const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Lista de destinatarios vacía' });
        }

        // Si hay múltiples destinatarios, usamos bcc para proteger la privacidad
        const mailOptions = {
            from: `"Gantt Publicartel" <${gmailUser}>`,
            to: recipients.length === 1 ? recipients[0] : gmailUser,
            bcc: recipients.length > 1 ? recipients.join(', ') : undefined,
            subject: subject,
            text: text,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (emailError) {
        console.error('Error al enviar correo por Gmail SMTP:', emailError);
        let errorMsg = emailError.message || 'Error desconocido al enviar correo';
        if (emailError.code === 'EAUTH' || errorMsg.includes('Invalid login') || errorMsg.includes('535')) {
            errorMsg = 'Error de autenticación en Gmail. Verifica que GMAIL_USER sea correcto y que GMAIL_PASS sea una Contraseña de Aplicación activa (16 caracteres, no tu contraseña habitual).';
        }
        return res.status(500).json({ error: errorMsg, details: emailError.message, code: emailError.code });
    }
}
