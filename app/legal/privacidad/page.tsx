export const metadata = { title: "Política de Privacidad — YAMA AI" };

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "'Inter', ui-sans-serif, sans-serif", color: "#241F18", lineHeight: 1.6 }}>
      <h1 style={{ fontFamily: "'Iowan Old Style', Georgia, serif" }}>Política de Privacidad de YAMA AI</h1>
      <p><em>Última actualización: {new Date().toLocaleDateString("es")}</em></p>

      <h2>1. Quiénes somos</h2>
      <p>YAMA AI es una aplicación de inteligencia artificial para emprendedores y creadores de contenido, desarrollada por Cristian Yamazhaky Angulo Preciado.</p>

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li>Datos de registro: nombre y correo electrónico.</li>
        <li>Conversaciones que tienes con YAMA dentro de la app.</li>
        <li>Archivos e imágenes que eliges adjuntar voluntariamente al chat.</li>
        <li>Preferencias que configuras (personalidad de YAMA, perfil de usuario, nivel de lenguaje).</li>
        <li>Notas de memoria generadas automáticamente a partir de tus conversaciones, para personalizar futuras respuestas.</li>
        <li>Información de pago, procesada directamente por nuestro proveedor de pagos (nunca almacenamos números de tarjeta en nuestros servidores).</li>
      </ul>

      <h2>3. Cómo usamos tus datos</h2>
      <p>Usamos tus datos para: darte acceso a la app, personalizar las respuestas de YAMA según tu contexto, analizar los archivos que adjuntas cuando lo solicitas, generar tu "Reto diario" y procesar tu suscripción.</p>

      <h2>4. Con quién compartimos tus datos</h2>
      <p>Tus mensajes y archivos adjuntos se procesan mediante el proveedor de inteligencia artificial configurado para generar las respuestas de YAMA. La aplicación usa Gemini para analizar imágenes y documentos; los adjuntos se almacenan en un bucket privado de Supabase Storage. Tu información de pago es procesada por Stripe. No vendemos tus datos a terceros con fines publicitarios.</p>

      <h2>5. Tus derechos</h2>
      <p>Puedes eliminar tu cuenta y todos tus datos asociados en cualquier momento desde la Configuración de la app, en la sección "Cuenta" → "Eliminar cuenta permanentemente". Esta acción es irreversible.</p>

      <h2>6. Seguridad</h2>
      <p>Tus datos se almacenan en una base de datos con acceso restringido. Las contraseñas se guardan de forma cifrada, nunca en texto plano.</p>

      <h2>7. Contacto</h2>
      <p>Si tienes preguntas sobre esta política, puedes escribirnos por WhatsApp desde la Configuración de la app, opción "Enviar feedback".</p>
    </div>
  );
}
