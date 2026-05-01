<?php
/**
 * save.php - Manejo de modelos guardados
 * Sistema LOOPY.ESP - Guardado y carga de modelos mediante archivos JSON
 */

// Configuración
define('MODELS_DIR', __DIR__ . '/models/');
define('MAX_MODELS', 1000);

// Crear directorio de modelos si no existe
if (!file_exists(MODELS_DIR)) {
    mkdir(MODELS_DIR, 0755, true);
}

// Función para generar ID corto
function generateShortId($length = 6) {
    $chars = 'abcdefghijkmnopqrstuvwxyz23456789';
    $id = '';
    for ($i = 0; $i < $length; $i++) {
        $id .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $id;
}

// Función para limpiar modelos antiguos (más de 30 días)
function cleanupOldModels() {
    $files = glob(MODELS_DIR . '*.json');
    foreach ($files as $file) {
        // Si el archivo tiene más de 30 días, eliminarlo
        if (filemtime($file) < time() - (30 * 24 * 60 * 60)) {
            @unlink($file);
        }
    }
}

// Función para obtener el contenido de un modelo por ID
function getModelById($id) {
    $filename = MODELS_DIR . $id . '.json';
    if (file_exists($filename)) {
        $content = file_get_contents($filename);
        $data = json_decode($content, true);
        if ($data && isset($data['model'])) {
            return $data;
        }
    }
    return null;
}

// Función para guardar un modelo
function saveModel($id, $modelData) {
    $filename = MODELS_DIR . $id . '.json';
    $data = array(
        'id' => $id,
        'model' => $modelData,
        'created' => date('c'),
        'updated' => date('c'),
        'version' => '1.0'
    );
    return file_put_contents($filename, json_encode($data, JSON_UNESCAPED_UNICODE)) !== false;
}

// Función para contar modelos activos
function countModels() {
    $files = glob(MODELS_DIR . '*.json');
    return count($files);
}

// Función para limpiar modelos si hay demasiados
function enforceMaxModels() {
    $files = glob(MODELS_DIR . '*.json');
    if (count($files) > MAX_MODELS) {
        // Ordenar por fecha de creación (más antiguos primero)
        usort($files, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        // Eliminar los más antiguos hasta estar por debajo del límite
        while (count($files) > MAX_MODELS) {
            $oldest = array_shift($files);
            @unlink($oldest);
        }
    }
}

// Limpiar modelos antiguos al inicio
cleanupOldModels();
enforceMaxModels();

// Determinar la acción a realizar
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Configurar headers para CORS y JSON
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Manejo de GET para obtener modelo
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    switch ($action) {
        case 'get':
            // Obtener modelo por ID
            $id = isset($_GET['id']) ? $_GET['id'] : '';
            if (empty($id)) {
                echo json_encode(array('error' => 'ID no proporcionado'));
                exit;
            }
            
            $model = getModelById($id);
            if ($model) {
                echo json_encode(array(
                    'success' => true,
                    'model' => $model['model']
                ));
            } else {
                echo json_encode(array(
                    'success' => false,
                    'error' => 'Modelo no encontrado'
                ));
            }
            exit;
            
        case 'exists':
            // Verificar si un modelo existe
            $id = isset($_GET['id']) ? $_GET['id'] : '';
            if (empty($id)) {
                echo json_encode(array('exists' => false));
                exit;
            }
            
            $filename = MODELS_DIR . $id . '.json';
            echo json_encode(array(
                'exists' => file_exists($filename)
            ));
            exit;
            
        default:
            // Información del servicio
            echo json_encode(array(
                'service' => 'LOOPY.ESP Model Storage',
                'version' => '1.0',
                'endpoints' => array(
                    'POST: ?action=save - Guardar modelo (enviar model en body)',
                    'GET: ?action=get&id=XXXXX - Obtener modelo',
                    'GET: ?action=exists&id=XXXXX - Verificar si existe'
                )
            ));
            exit;
    }
}

// Manejo de POST para guardar modelo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'save') {
        // Obtener datos del body
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data || !isset($data['model'])) {
            // Intentar con $_POST por compatibilidad
            if (isset($_POST['model'])) {
                $modelData = $_POST['model'];
            } else {
                echo json_encode(array(
                    'success' => false,
                    'error' => 'Datos del modelo no proporcionados'
                ));
                exit;
            }
        } else {
            $modelData = $data['model'];
        }
        
        // Generar ID único
        $id = generateShortId();
        
        // Asegurarse de que el ID no exista
        $maxAttempts = 10;
        $attempts = 0;
        while (file_exists(MODELS_DIR . $id . '.json') && $attempts < $maxAttempts) {
            $id = generateShortId();
            $attempts++;
        }
        
        // Guardar modelo
        if (saveModel($id, $modelData)) {
            $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http');
            $baseUrl .= '://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
            $baseUrl = preg_replace('/save\.php.*/', 'index.html', $baseUrl);
            
            echo json_encode(array(
                'success' => true,
                'id' => $id,
                'shortUrl' => $baseUrl . '?s=' . $id,
                'message' => 'Modelo guardado exitosamente'
            ));
        } else {
            echo json_encode(array(
                'success' => false,
                'error' => 'Error al guardar el modelo'
            ));
        }
        exit;
    }
}

// Método no permitido
http_response_code(405);
echo json_encode(array(
    'error' => 'Método no permitido'
));