# Monitoramento Ambiental — PHP + MySQL

Dashboard responsivo ligado ao esquema de banco fornecido: `mac`, `codigo`, `wifi`, `coleta`, `macsens` e `leitura`.

## Como as caixas são carregadas

- A lista de caixas é consultada em `mac`.
- O nome vem de `mac.nome`; se estiver vazio, é exibido `Caixa {idmac}`.
- O status vem de `mac.ativo`.
- O IP, rede e último login vêm do registro mais recente de `wifi` (a API já retorna esses campos; a interface atual não os exibe ainda).
- As leituras são relacionadas por `leitura.macsens_idmacsens` → `macsens` → `codigo`, e por `leitura.coleta_idcoleta` → `coleta`.
- O dashboard reconhece sensores cujo nome contenha `temper`, `temp`, `umid`, `humid` ou `press`.
- O valor apresentado é `leitura.valor * codigo.fator`; quando `fator` for `NULL`, o fator utilizado é 1.
- Sensores com nomes diferentes desses continuam armazenados no banco, mas não são exibidos nos indicadores de temperatura, umidade e pressão.

## Configuração

1. Coloque a pasta em um servidor com PHP 8+ e extensão PDO MySQL habilitada. Abrir `index.html` diretamente no celular não executa PHP.
2. Edite `api/config.php` com host, nome do banco, usuário e senha do MySQL.
3. Sirva a pasta por HTTP/HTTPS a partir do servidor PHP.
4. Teste `https://seu-dominio/api/stations.php` e `https://seu-dominio/api/readings.php`.
5. Cadastre os dispositivos em `mac` e relacione os sensores em `macsens` com os respectivos registros de `codigo`.

## Observações importantes

- A consulta de leituras retorna até 5.000 registros dos últimos 30 dias por padrão; o limite de tempo pode ser alterado com `?days=7`, por exemplo (1 a 90 dias).
- Os períodos de 24h, 7 dias e 30 dias são filtrados no navegador sobre os dados que a API retornou. Para o período de 30 dias, a API já entrega até 30 dias.
- Os nomes dos sensores em `codigo.sensor` (ou, se vazio, `leitura.nome`) precisam identificar claramente temperatura, umidade e pressão para aparecerem nos três indicadores.
- O campo `codigo.fator` é aplicado como multiplicador. Confirme com quem mantém o firmware/banco se esse é o significado esperado do fator.
- `coleta.datafim`, `coleta.datainicio` e `wifi.datalogin` não são tratados como se fossem medições de sensor.
- Nenhum dado é simulado. Se o banco não tiver registros, a interface mostra “Sem dados”.
- Para produção, restrinja `API_CORS_ORIGIN` ao domínio do frontend e mantenha `config.php` fora de repositórios públicos.
