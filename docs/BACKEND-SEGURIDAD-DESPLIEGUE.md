# Backend seguro y publicación

## Arquitectura

La app mantiene las capas Vista → Controlador → Repositorio → Servicio. Firebase Auth autentica; Firestore/Storage aplican reglas. Las escrituras de rutinas pasan por `guardarRutina`, porque sus listas anidadas requieren validación completa. Las búsquedas USDA pasan por `buscarAlimentos`; la clave nunca debe estar en el APK. Ambas funciones exigen Auth y App Check, validan con Zod, tienen límites transaccionales y ocultan errores internos. Zustand guarda estado visual de sesión validado con Zod; no concede permisos ni almacena claves USDA.

## Preparación local

```powershell
npm ci
npm ci --prefix functions
npm run test:backend
npm run test:security
```

Java 21 o superior es necesario para el emulador. `test:security` utiliza exclusivamente `demo-coach-security`, no el proyecto real. Las funciones se despliegan sobre Node 22. Los emuladores se ejecutan en localhost. No se desactiva App Check en producción para facilitar pruebas.

## Proyecto y configuración externa

El alias `production` apunta a `coach-app-90f95`. No se configuró un alias `default`, para evitar publicar accidentalmente. Un proyecto de pruebas separado debe crearse antes de ensayar una migración real; nunca usar producción como emulador.

1. Confirmar el plan de facturación compatible con Functions y Secret Manager, región `us-central1`, alertas de gasto e IAM de mínimo privilegio. Los límites de instancias no equivalen a un tope garantizado de gasto.
2. Registrar la app Android y sus SHA-256 de firma en Firebase App Check con Play Integrity. Comprobar que `google-services.json` corresponde al proyecto y al paquete Android.
3. Recompilar el development build/APK: los módulos nuevos de App Check no funcionan en Expo Go. En desarrollo se utiliza el proveedor debug del SDK; registrar su token local en consola sin subirlo a Git. No configurar tokens debug en builds de producción.
4. Para web, registrar reCAPTCHA Enterprise y configurar `EXPO_PUBLIC_APP_CHECK_SITE_KEY`, que es pública. Registrar los dominios permitidos. La exportación estática no inicializa APIs de navegador en el servidor.
5. Crear `USDA_API_KEY` en Secret Manager con `firebase functions:secrets:set USDA_API_KEY --project production`. La CLI solicita el valor sin incluirlo en el comando. Usar una clave nueva si la anterior se distribuyó dentro de un APK; revocar la anterior al completar la migración. Eliminar `EXPO_PUBLIC_FOOD_DATA_API_KEY` de entornos locales y EAS. No introducir secretos en `.env.example`.
6. Revisar las métricas App Check y la compatibilidad de los clientes antes de activar enforcement en Firestore y Storage. Las funciones nuevas ya lo exigen en el código. El cliente usa el SDK nativo como proveedor del SDK JS para adjuntar tokens a sus solicitudes.

## Publicación coordinada

Primero probar funciones y reglas con emuladores y un proyecto de pruebas. Revisar datos antiguos: los lectores nuevos rechazan campos de dominio inválidos y las reglas exigen fechas del servidor. No reparar ni borrar datos de usuarios sin una copia y un plan de migración.

```powershell
firebase login
firebase deploy --only functions --project production
# Probar App Check, login, USDA y crear/editar rutinas con el APK nuevo.
# Distribuir el cliente y coordinar la actualización obligatoria antes de cerrar escrituras antiguas.
firebase deploy --only firestore:rules,firestore:indexes,storage --project production
```

No publicar las reglas nuevas mientras clientes antiguos dependan de escrituras directas de rutinas o consultas sin límite: dejarían de funcionar. El despliegue final requiere verificar el cliente firmado, los proveedores App Check y el secreto, no solo que TypeScript compile.

Para revertir, recuperar la versión anterior de reglas desde control de versiones y desplegarla con el mismo alias explícito, evaluando la reapertura temporal de permisos. No borrar colecciones ni desactivar indiscriminadamente las reglas.

## Datos y operaciones

- Firestore deniega campos desconocidos, cambios de propietario, fechas falsificadas, rangos inválidos y escrituras directas de rutinas; listas limitadas a 500 por consulta.
- Storage solo permite lectura autenticada bajo `maquinas/` y `ejercicios/`; ninguna escritura de cliente. Los archivos privados requieren un diseño por UID y no deben compartirse mediante URLs públicas con token.
- Reportes: intervalos por fecha y páginas con cursor de 500; más de 10000 registros produce un error que pide reducir período, nunca un total incompleto presentado como completo.
- Pantallas en tiempo real: los 500 registros más recientes. El informe permite consultar períodos anteriores mediante paginación. Las cifras de las pantallas corresponden a esa ventana.
- Cuotas: 15 búsquedas/minuto y 120/hora por usuario; 800/hora globales. Rutinas: 20 escrituras/minuto y 200/hora por usuario. Son ventanas fijas; revisar métricas antes de ajustar. `_cuotas` es privada y usa TTL en `expiraEn`.
- No se registran términos de búsqueda, tokens, claves ni cuerpos de respuesta de USDA en logs. Revisar alertas de errores, rechazos App Check y consumo; establecer retención de logs en consola.
- Las eliminaciones de perfil no constituyen eliminación completa de cuenta ni de subcolecciones. No presentar esa operación al usuario como borrado integral sin implementar su ciclo de vida.

## Comprobaciones

CI comprueba TypeScript, lint, formato, exportación web, pruebas de app, backend, reglas y auditoría de dependencias. Las pruebas de handlers invocan el código de negocio en el emulador; no sustituyen la prueba real de attestation con un APK firmado y App Check configurado.

Fuentes: [funciones invocables](https://firebase.google.com/docs/functions/callable), [App Check nativo](https://rnfirebase.io/app-check/usage), [proveedor personalizado JS](https://firebase.google.com/docs/app-check/web/custom-provider), [reglas y validación](https://firebase.google.com/docs/firestore/security/rules-fields).
