<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

function sensorType(string $name): ?string {
    $s = mb_strtolower(trim($name), 'UTF-8');
    if (str_contains($s, 'temper') || preg_match('/(^|[^a-z])temp([^a-z]|$)/', $s)) return 'temperature';
    if (str_contains($s, 'umid') || str_contains($s, 'humid')) return 'humidity';
    if (str_contains($s, 'press')) return 'pressure';
    return null;
}

try {
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    $days = max(1, min($days, 90));
    $stationId = isset($_GET['station_id']) && $_GET['station_id'] !== 'all'
        ? (int)$_GET['station_id'] : null;

    /*
     * Relacionamentos conforme o esquema fornecido:
     * mac -> macsens -> codigo
     * leitura -> macsens e coleta
     * coleta -> mac
     *
     * O fator do cadastro de cada sensor é aplicado ao valor bruto quando
     * estiver preenchido; se for NULL, usa-se 1.
     */
    $sql = "
        SELECT
            m.idmac AS station_id,
            COALESCE(NULLIF(m.nome, ''), CONCAT('Caixa ', m.idmac)) AS station_name,
            COALESCE(m.ativo, 0) AS active,
            l.idleitura AS reading_id,
            l.datahora AS timestamp,
            l.valor AS raw_value,
            COALESCE(c.fator, 1) AS factor,
            COALESCE(NULLIF(c.sensor, ''), NULLIF(l.nome, ''), 'Sensor') AS sensor_name,
            COALESCE(NULLIF(c.unidade, ''), '') AS unit,
            co.idcoleta AS collection_id,
            co.nome AS collection_name,
            co.localidade AS locality
        FROM leitura l
        INNER JOIN macsens ms ON ms.idmacsens = l.macsens_idmacsens
        INNER JOIN mac m ON m.idmac = ms.mac_idmac
        INNER JOIN codigo c ON c.idcodigo = ms.codigo_idcodigo
        LEFT JOIN coleta co ON co.idcoleta = l.coleta_idcoleta
        WHERE l.datahora >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
    ";
    $params = [];
    if ($stationId !== null) {
        $sql .= " AND m.idmac = :station_id";
        $params[':station_id'] = $stationId;
    }
    $sql .= " ORDER BY l.datahora DESC, l.idleitura DESC LIMIT 5000";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rawRows = $stmt->fetchAll();

    /*
     * Junta sensores da mesma caixa e instante em um único ponto do gráfico/tabela.
     * O campo nome/sensor é usado para reconhecer temperatura, umidade e pressão.
     * Outros sensores continuam no banco, mas não ocupam os três indicadores principais.
     */
    $grouped = [];
    foreach ($rawRows as $r) {
        if ($r['timestamp'] === null) continue;
        $key = $r['station_id'] . '|' . $r['timestamp'] . '|' . ($r['collection_id'] ?? '0');
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'station_id' => (string)$r['station_id'],
                'station_name' => $r['station_name'],
                'active' => (bool)$r['active'],
                'timestamp' => $r['timestamp'],
                'temperature' => null,
                'humidity' => null,
                'pressure' => null,
                'temperature_unit' => '°C',
                'humidity_unit' => '%',
                'pressure_unit' => 'hPa',
                'collection_id' => $r['collection_id'] === null ? null : (int)$r['collection_id'],
                'collection_name' => $r['collection_name'],
                'locality' => $r['locality'],
            ];
        }
        $type = sensorType((string)$r['sensor_name']);
        if ($type !== null && $r['raw_value'] !== null) {
            $value = (float)$r['raw_value'] * (float)$r['factor'];
            $grouped[$key][$type] = $value;
            if ($r['unit'] !== '') $grouped[$key][$type . '_unit'] = $r['unit'];
        }
    }
    $result = array_values($grouped);
    usort($result, static fn($a, $b) => strcmp($b['timestamp'], $a['timestamp']));
    jsonResponse($result);
} catch (Throwable $e) {
    error_log('readings.php: ' . $e->getMessage());
    jsonError('Não foi possível consultar as leituras. Confira as tabelas e a configuração do banco.');
}
