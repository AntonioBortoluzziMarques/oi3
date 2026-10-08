<?php
declare(strict_types=1);
require_once __DIR__.'/db.php'; require_once __DIR__.'/response.php';
try {
  /*
   * Ajustar quando as tabelas existirem.
   * Contrato do frontend:
   * station_id, station_name, timestamp, temperature, humidity, pressure
   *
   * Exemplo:
   * SELECT l.caixa_id station_id,c.nome station_name,l.data_hora timestamp,
   * l.temperatura temperature,l.umidade humidity,l.pressao pressure
   * FROM leituras l JOIN caixas c ON c.id=l.caixa_id
   * ORDER BY l.data_hora DESC LIMIT :limit
   */
  jsonResponse([]);
} catch(Throwable $e){error_log($e->getMessage());jsonError('Não foi possível consultar as leituras.');}
