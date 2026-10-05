# RED — revisão editorial e fonte interna

- Data: 2026-10-02
- Node: 22.23.2; Vitest 4.1.11.
- Execução: 4 arquivos focais; 33 testes totais; 9 falhas esperadas e 24 aprovações.

As falhas reproduziram os quatro achados da segunda crítica: os eventos
`APROVAR_CLINICAMENTE` e `SOLICITAR_AJUSTES` passavam pelo contrato e pelo
caso de uso de transição genérica; `AUTHOR + MODERATOR` recebia
`canOpenAuthoring=true` para registro de outro autor e podia ler a fonte; e
essa mesma combinação podia receber ação de solicitar ajustes no próprio
registro mesmo com identidade configurada divergente. A rota HTTP genérica
também alcançava a dependência de transição (resposta 500 no teste sem
dependência), em vez de rejeitar os eventos antes do caso de uso.

Resultado: RED, exit 1. Nenhum serviço ou workflow remoto foi iniciado.
