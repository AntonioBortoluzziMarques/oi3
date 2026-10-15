<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

try {
    /*
     * Cada dispositivo vem da tabela mac.
     * O último login Wi-Fi é opcional e serve apenas como informação de conexão.
     */
    $sql = "
        SELECT
            m.idmac AS id,
            COALESCE(NULLIF(m.nome, ''), CONCAT('Caixa ', m.idmac)) AS name,
            COALESCE(m.ativo, 0) AS active,
            w.ip AS ip,
            w.rede AS network,
            w.datalogin AS last_login
        FROM mac m
        LEFT JOIN wifi w ON w.idwifi = (
            SELECT w2.idwifi
            FROM wifi w2
            WHERE w2.mac_idmac = m.idmac
            ORDER BY w2.datalogin DESC, w2.idwifi DESC
            LIMIT 1
        )
        ORDER BY m.idmac ASC
    ";
    $rows = db()->query($sql)->fetchAll();
    foreach ($rows as &$row) {
        $row['id'] = (string)$row['id'];
        $row['active'] = (bool)$row['active'];
    }
    unset($row);
    jsonResponse($rows);
} catch (Throwable $e) {
    error_log('stations.php: ' . $e->getMessage());
    jsonError('Não foi possível consultar a tabela mac. Confira a configuração do banco.');
}
