Este proyecto (KPCL0040) utiliza HiveMQ Cloud con autenticacion por usuario/contraseña.
Las credenciales MQTT se configuran en include/config.h (MQTT_USER, MQTT_PASS).
La conexion TLS se establece con WiFiClientSecure::setInsecure() (sin verificacion de certificado del servidor).
