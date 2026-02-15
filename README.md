# Guía de Despliegue: Portal de Pedidos B2B

Esta guía explica cómo poner en marcha tu Portal de Pedidos para que tus compañeros puedan probarlo desde Google Sites, y cómo configurar el envío de emails reales.

## 1. Configuración de EmailJS (Para que lleguen los correos)

El portal está listo para enviar correos, pero necesita tus credenciales. 
1.  Regístrate gratis en [EmailJS](https://www.emailjs.com/).
2.  Crea un **Email Service** (conecta tu Gmail).
3.  Crea un **Email Template**.
    *   Usa variables como `{{to_name}}`, `{{order_id}}`, `{{order_total}}`, `{{order_details}}`.
4.  Obtén tus claves en "Account" > "API Keys".
5.  **IMPORTANTE:** Para que funcione en el despliegue, debes configurar estas variables de entorno en Vercel (ver paso 2) o editar `App.tsx` directamente con las claves si es solo una prueba rápida.

## 2. Despliegue en Vercel (Recomendado)

La forma más fácil de tener una URL segura (`https://...`) para Google Sites.

1.  Sube este código a tu GitHub.
2.  Ve a [Vercel](https://vercel.com) y regístrate con GitHub.
3.  Haz clic en "Add New..." > "Project".
4.  Selecciona el repositorio `portal-pedidos-dm`.
5.  Vercel detectará que es Vite. Deja la configuración por defecto.
6.  (Opcional pero recomendado) En "Environment Variables", añade:
    *   `VITE_EMAILJS_SERVICE_ID`: (Tu Service ID)
    *   `VITE_EMAILJS_TEMPLATE_ID`: (Tu Template ID)
    *   `VITE_EMAILJS_PUBLIC_KEY`: (Tu Public Key)
7.  Haz clic en **Deploy**.
8.  Espera unos segundos. ¡Tendrás una URL como `https://portal-pedidos-dm.vercel.app`!

## 3. Integración en Google Sites

Una vez tengas la URL de Vercel (ej. `https://mi-portal.vercel.app`):

1.  Abre tu Google Site en modo edición.
2.  Ve a la página donde quieres el portal (o crea una nueva "Área Clientes").
3.  En el panel derecho, haz clic en **Insertar** > **Incorporar** (Embed).
4.  Pega la URL de tu aplicación desplegada.
5.  Selecciona "Página entera" o ajusta el marco para que ocupe todo el ancho y alto disponible.
6.  **Publica** tu Google Site.

## Solución de Problemas

*   **No se envía el email:** Abre la consola del navegador (F12) al hacer el pedido. Si ves un mensaje de éxito, el código funciona y revisa tu bandeja de Spam. Si ves error, revisa las credenciales de EmailJS.
*   **La página sale en blanco en Google Sites:** Asegúrate de que la URL de Vercel empieza por `https://`. Google Sites bloquea contenido no seguro (`http://`).

---
**Nota Técnica:** El proyecto ha sido configurado para compilar correctamente (`npm run build`). No necesitas tocar código complejo, solo subirlo y desplegar.
