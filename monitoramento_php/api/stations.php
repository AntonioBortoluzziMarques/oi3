<?php
declare(strict_types=1);
require_once __DIR__.'/db.php'; require_once __DIR__.'/response.php';
try {
  /* Exemplo futuro:
     SELECT id,nome name,ativo active FROM caixas ORDER BY id
  */
  jsonResponse([]);
} catch(Throwable $e){error_log($e->getMessage());jsonError('Não foi possível consultar as estações.');}
