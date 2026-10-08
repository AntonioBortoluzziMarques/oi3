# Monitoramento Ambiental

Dashboard responsivo para múltiplas caixas de sensores.

Sensores previstos: temperatura, umidade relativa e pressão atmosférica. Não há vento.

## Estrutura
- index.html
- style.css
- app.js
- api/config.php
- api/db.php
- api/response.php
- api/readings.php
- api/stations.php

## Arquitetura
Sensores -> MySQL -> PHP API -> Dashboard

As tabelas ainda não existem. Por isso os endpoints retornam [] e têm comentários com as queries que deverão ser adaptadas.

### /api/stations.php
Retorno:
[{"id":1,"name":"Caixa 01","active":true}]

### /api/readings.php
Retorno:
[{"station_id":1,"station_name":"Caixa 01","timestamp":"2026-10-08 10:30:00","temperature":24.4,"humidity":63.1,"pressure":1012.4}]

## Segurança
As credenciais ficam no PHP, nunca no JavaScript. Não publique config.php com credenciais reais em repositório público.

## Hospedagem
Como agora existe PHP, não use o projeto como Static Site. É necessário um servidor PHP. O banco MySQL também precisa ser acessível pelo servidor.
