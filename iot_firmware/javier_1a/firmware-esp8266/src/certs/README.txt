Este directorio ya no se usa.

El dispositivo KPCL0037 ahora utiliza HiveMQ Cloud como broker MQTT.
La autenticación se realiza mediante usuario/contraseña (definidos en config.h),
por lo que no se requieren certificados de cliente.

La conexión TLS se establece con setInsecure() para simplicidad.
