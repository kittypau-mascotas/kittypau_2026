#!/bin/bash

# ========================================
# KITTYPAU IOT - MIGRATION SCRIPT
# De Desarrollo (Docker) → Producción (Cloud)
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║   🚀 MIGRACIÓN A PRODUCCIÓN 🚀           ║
║   Docker → Supabase + HiveMQ + Vercel    ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ========================================
# PASO 1: Verificar prerrequisitos
# ========================================
echo -e "\n${YELLOW}📋 Verificando prerrequisitos...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: No se encuentra docker-compose.yml${NC}"
    echo -e "Por favor ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI no está instalado${NC}"
    echo -e "Instala con: ${YELLOW}npm i -g vercel${NC}"
    exit 1
fi

# Verificar git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerrequisitos OK${NC}"

# ========================================
# PASO 2: Preguntas de configuración
# ========================================
echo -e "\n${BLUE}⚙️  Configuración de servicios cloud${NC}\n"

read -p "¿Has creado tu proyecto en Supabase? (y/n): " SUPABASE_READY
if [ "$SUPABASE_READY" != "y" ]; then
    echo -e "\n${YELLOW}📝 Crear proyecto en Supabase:${NC}"
    echo "1. Ve a https://supabase.com"
    echo "2. Sign up con GitHub"
    echo "3. Crea nuevo proyecto: kittypau-iot"
    echo "4. Guarda las credenciales"
    echo ""
    read -p "Presiona Enter cuando hayas terminado..."
fi

read -p "¿Has creado tu cluster en HiveMQ Cloud? (y/n): " HIVEMQ_READY
if [ "$HIVEMQ_READY" != "y" ]; then
    echo -e "\n${YELLOW}📝 Crear cluster en HiveMQ:${NC}"
    echo "1. Ve a https://console.hivemq.cloud"
    echo "2. Sign up gratis"
    echo "3. Crea cluster: kittypau-broker (Serverless/Free)"
    echo "4. Crea credenciales MQTT"
    echo ""
    read -p "Presiona Enter cuando hayas terminado..."
fi

# ========================================
# PASO 3: Recopilar credenciales
# ========================================
echo -e "\n${BLUE}🔑 Ingresa tus credenciales${NC}\n"

read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY

read -p "HiveMQ Cluster URL (xxxxx.s1.eu.hivemq.cloud): " HIVEMQ_URL
read -p "HiveMQ Username: " HIVEMQ_USER
read -sp "HiveMQ Password: " HIVEMQ_PASS
echo ""

# Generar secret para webhook
WEBHOOK_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")

# ========================================
# PASO 4: Exportar datos de desarrollo
# ========================================
echo -e "\n${YELLOW}💾 Exportando datos de desarrollo...${NC}"

if docker compose ps postgres | grep -q "Up"; then
    echo "Exportando base de datos PostgreSQL..."
    docker compose exec -T postgres pg_dump -U kittypau kittypau_dev > backup_dev_$(date +%Y%m%d_%H%M%S).sql
    echo -e "${GREEN}✅ Backup creado${NC}"
else
    echo -e "${YELLOW}⚠️  Contenedor de PostgreSQL no está corriendo${NC}"
    echo "No se exportarán datos de desarrollo"
fi

# ========================================
# PASO 5: Crear archivo de producción
# ========================================
echo -e "\n${YELLOW}📝 Creando configuración de producción...${NC}"

cat > .env.production << EOF
# ========================================
# PRODUCCIÓN - Supabase + HiveMQ + Vercel
# ========================================

# Supabase
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# HiveMQ Cloud
MQTT_BROKER_URL=${HIVEMQ_URL}
MQTT_PORT=8883
MQTT_USERNAME=${HIVEMQ_USER}
MQTT_PASSWORD=${HIVEMQ_PASS}

# Webhook Security
MQTT_WEBHOOK_SECRET=${WEBHOOK_SECRET}

# Frontend
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF

echo -e "${GREEN}✅ .env.production creado${NC}"

# ========================================
# PASO 6: Preparar estructura para Vercel
# ========================================
echo -e "\n${YELLOW}🏗️  Preparando estructura para Vercel...${NC}"

# Crear vercel.json si no existe
if [ ! -f "vercel.json" ]; then
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
    "MQTT_WEBHOOK_SECRET": "@mqtt-webhook-secret"
  }
}
EOF
    echo -e "${GREEN}✅ vercel.json creado${NC}"
fi

# Agregar script de build al client/package.json
if [ -f "client/package.json" ]; then
    if ! grep -q "vercel-build" client/package.json; then
        echo "Agregando script vercel-build..."
        # Esto es simplificado, en producción usarías jq
        echo -e "${YELLOW}⚠️  Agrega manualmente a client/package.json:${NC}"
        echo '"scripts": { "vercel-build": "npm run build" }'
    fi
fi

# ========================================
# PASO 7: Inicializar BD en Supabase
# ========================================
echo -e "\n${YELLOW}🗄️  Inicializando base de datos en Supabase...${NC}"

if [ -f "docker/postgres/init.sql" ]; then
    echo "Archivo init.sql encontrado"
    echo ""
    echo -e "${BLUE}Copia el contenido de ${YELLOW}docker/postgres/init.sql${NC}"
    echo -e "${BLUE}y pégalo en el SQL Editor de Supabase:${NC}"
    echo "https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
    echo ""
    read -p "Presiona Enter cuando hayas ejecutado el SQL..."
    echo -e "${GREEN}✅ Base de datos inicializada${NC}"
fi

# ========================================
# PASO 8: Git commit
# ========================================
echo -e "\n${YELLOW}📦 Preparando código para deploy...${NC}"

read -p "¿Hacer commit de los cambios? (y/n): " DO_COMMIT
if [ "$DO_COMMIT" = "y" ]; then
    git add .
    git commit -m "Preparado para producción - $(date +%Y%m%d)"
    echo -e "${GREEN}✅ Commit realizado${NC}"
    
    read -p "¿Hacer push a GitHub? (y/n): " DO_PUSH
    if [ "$DO_PUSH" = "y" ]; then
        git push origin main
        echo -e "${GREEN}✅ Push realizado${NC}"
    fi
fi

# ========================================
# PASO 9: Deploy a Vercel
# ========================================
echo -e "\n${YELLOW}🚀 Desplegando a Vercel...${NC}"

read -p "¿Continuar con deploy a Vercel? (y/n): " DO_DEPLOY
if [ "$DO_DEPLOY" = "y" ]; then
    
    # Login si es necesario
    if ! vercel whoami &> /dev/null; then
        echo "Iniciando sesión en Vercel..."
        vercel login
    fi
    
    # Configurar variables de entorno
    echo "Configurando variables de entorno..."
    vercel env add SUPABASE_URL production <<< "$SUPABASE_URL"
    vercel env add SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"
    vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SUPABASE_SERVICE_ROLE_KEY"
    vercel env add MQTT_WEBHOOK_SECRET production <<< "$WEBHOOK_SECRET"
    
    # Deploy
    echo "Desplegando a producción..."
    vercel --prod
    
    VERCEL_URL=$(vercel inspect --token $(vercel token) 2>/dev/null | grep -o 'https://[^"]*' | head -1)
    
    echo -e "\n${GREEN}✅ Deploy completado${NC}"
    echo -e "${BLUE}URL de producción: ${GREEN}${VERCEL_URL}${NC}"
fi

# ========================================
# PASO 10: Configurar Webhook en HiveMQ
# ========================================
echo -e "\n${YELLOW}🔗 Configurar Webhook en HiveMQ${NC}\n"

echo "Ve a HiveMQ Console → Extensions → Webhook Extension"
echo ""
echo -e "${BLUE}Configuración:${NC}"
echo "  URL: ${GREEN}${VERCEL_URL}/api/mqtt/webhook${NC}"
echo "  Topic Filter: ${GREEN}kittypau/+/telemetry${NC}"
echo "  Method: ${GREEN}POST${NC}"
echo "  Headers:"
echo "    ${GREEN}x-webhook-token: ${WEBHOOK_SECRET}${NC}"
echo ""
read -p "Presiona Enter cuando hayas configurado el webhook..."

# ========================================
# PASO 11: Instrucciones para ESP32
# ========================================
echo -e "\n${YELLOW}📡 Configuración para ESP32${NC}\n"

cat > esp32_production_config.txt << EOF
// ========================================
// CONFIGURACIÓN ESP32 PRODUCCIÓN
// ========================================

// WiFi
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

// MQTT - HiveMQ Cloud
const char* mqtt_server = "${HIVEMQ_URL}";
const int mqtt_port = 8883;  // SSL
const char* mqtt_user = "${HIVEMQ_USER}";
const char* mqtt_password = "${HIVEMQ_PASS}";

// Importante: Agregar antes de conectar
espClient.setInsecure();  // Para HiveMQ free tier

// Topic para publicar
String topic = "kittypau/" + String(device_id) + "/telemetry";
EOF

echo -e "Configuración guardada en: ${GREEN}esp32_production_config.txt${NC}"
echo "Copia estos valores a tu sketch del ESP32"

# ========================================
# RESUMEN FINAL
# ========================================
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡MIGRACIÓN COMPLETADA!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}\n"

echo -e "${BLUE}🎯 Próximos pasos:${NC}"
echo "1. Configurar webhook en HiveMQ (si no lo hiciste)"
echo "2. Programar ESP32 con la configuración de producción"
echo "3. Probar el flujo completo:"
echo "   - ESP32 publica a HiveMQ"
echo "   - HiveMQ dispara webhook a Vercel"
echo "   - Vercel guarda en Supabase"
echo "   - Frontend muestra datos"
echo ""

echo -e "${BLUE}📊 URLs importantes:${NC}"
echo "  Frontend: ${GREEN}${VERCEL_URL}${NC}"
echo "  API: ${GREEN}${VERCEL_URL}/api${NC}"
echo "  Supabase Dashboard: ${GREEN}https://supabase.com/dashboard${NC}"
echo "  HiveMQ Console: ${GREEN}https://console.hivemq.cloud${NC}"
echo "  Vercel Dashboard: ${GREEN}https://vercel.com/dashboard${NC}"
echo ""

echo -e "${BLUE}🔐 Archivos creados:${NC}"
echo "  .env.production - Credenciales de producción"
echo "  esp32_production_config.txt - Config para ESP32"
echo "  backup_dev_*.sql - Backup de base de datos (si existe)"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  - NO subas .env.production a Git"
echo "  - Guarda las credenciales en un lugar seguro"
echo "  - El webhook secret es: ${WEBHOOK_SECRET}"
echo ""

echo -e "${GREEN}¡Tu proyecto está en producción! 🚀${NC}\n"
