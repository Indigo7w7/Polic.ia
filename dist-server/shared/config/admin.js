/**
 * Lista centralizada de correos electrónicos de administradores principales.
 * El sistema usará esto para verificaciones de override y asignación de roles.
 */
export const ADMIN_EMAILS = [
    'brizq02@gmail.com'
];
/**
 * Función helper para verificar si un email tiene privilegios root
 */
export const isPrincipalAdmin = (email) => {
    if (!email)
        return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};
