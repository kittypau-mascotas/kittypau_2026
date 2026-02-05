require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY

);

async function testConnection() {
  console.log('🧪 Probando conexión a Supabase...\n');
  
  try {
    // Test 1: Obtener dispositivos
    console.log('📡 Test 1: Obteniendo dispositivos...');
    const { data: devices, error: devError } = await supabase
      .from('devices')
      .select('*');
    
    if (devError) throw devError;
    console.log('✅ Dispositivos encontrados:', devices.length);
    console.log(devices);
    
    // Test 2: Obtener lecturas de sensores
    console.log('\n📊 Test 2: Obteniendo lecturas de sensores...');
    const { data: readings, error: readError } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (readError) throw readError;
    console.log('✅ Lecturas encontradas:', readings.length);
    console.log(readings);
    
    // Test 3: Insertar lectura de prueba
    console.log('\n💾 Test 3: Insertando lectura de prueba...');
    const { data: newReading, error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        device_id: 'KPCL0001',
        temperature: 25.0,
        humidity: 60.0,
        weight_grams: 3600,
        battery_level: 80
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    console.log('✅ Lectura insertada:', newReading.id);
    
    console.log('\n🎉 ¡Todas las pruebas pasaron! Supabase está configurado correctamente.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();