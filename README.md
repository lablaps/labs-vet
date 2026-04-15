# LabVet - Laboratorio Inteligente

Aplicacao React/Vite para rotina de laboratorio veterinario. O projeto agora usa SQLite local, API propria sem dependencias extras, modo offline com fallback no navegador e uma interface voltada para protocolo, amostra, laudo, etiqueta QR, financeiro, estoque e auditoria.

## O que esta implementado

- SQLite local em `data/laboratorio.sqlite`, criado a partir de `db/schema.sql`.
- API local em Node (`server/index.js`) usando `node:sqlite`.
- Persistencia do app em SQLite com backup/fallback em `localStorage` quando a API local nao estiver disponivel.
- Cadastros de tutores, veterinarios, pacientes, laboratorios e usuarios.
- Troca de perfil no topo da interface, com escopo visual de RLS local por gestor, coordenador, veterinario e aluno/estagiario.
- Cadastro de exames com protocolo/OS, tipo de exame, veterinario solicitante, paciente, material recebido, condicao da amostra, datas de coleta/recebimento, prioridade e status.
- Requisicoes internas para recoleta, insumo, revisao de laudo, amostra externa e suporte.
- Editor simples de laudo com descricao macroscopica, microscopica, diagnostico, comentarios, responsavel e data de liberacao.
- Financeiro do exame com preco, forma de pagamento, status e convenio/plano.
- Busca por protocolo, animal, tutor, exame, laboratorio e solicitante.
- Etiquetas com QR Code gerado localmente e impressao pelo navegador.
- Exportacao/impressao em lote de laudos, permitindo salvar como PDF.
- Dashboard com amostras a receber, laudos pendentes, exames em andamento, requisicoes abertas, graficos e estoque critico.
- Upload de imagens/PDFs com area de arrastar e soltar, previa de imagens e captura pelo dispositivo quando disponivel.
- PWA basico com `manifest.webmanifest` e service worker para cache do shell da aplicacao.

## Modelo relacional

O schema principal esta em `db/schema.sql` e inclui:

- `labs`
- `tutors`
- `veterinarians`
- `patients`
- `patient_labs`
- `exams`
- `appointments`
- `requisitions`
- `inventory`
- `users`
- `attachments`
- `audit_events`

Indices importantes ja criados:

- `idx_exams_protocol`
- `idx_exams_received_at`
- `idx_exams_patient`
- `idx_patients_tutor`
- `idx_patient_labs_pair`

## Como rodar

```bash
npm install
npm run db:init
npm run dev
```

Depois acesse `http://127.0.0.1:5173`.

No Windows, se o PowerShell bloquear `npm`, use:

```bash
npm.cmd run db:init
npm.cmd run dev
```

## Scripts

- `npm run dev`: sobe API SQLite e Vite juntos.
- `npm run dev:ui`: sobe apenas o Vite.
- `npm run api`: sobe apenas a API SQLite em `http://127.0.0.1:4174`.
- `npm run db:init`: recria os dados demonstrativos no SQLite.
- `npm run build`: gera a versao de producao em `dist/`.

## Acesso de demonstracao

- Usuario: `ewaldo.santana@uema.br`
- Senha: `petcore@2026`

## Funcionamento online e offline

- Com a API local ativa, o app le e grava no SQLite.
- Sem a API local, a tela continua operando pelo backup no navegador.
- Quando a API volta e o usuario altera dados novamente, o app tenta gravar no SQLite outra vez.
- O service worker cacheia o shell da aplicacao, mas a sincronizacao entre maquinas ainda deve ser feita em etapa futura.

## Proximos passos recomendados

- Adicionar autenticacao real e perfis por papel.
- Criar sincronizacao entre SQLite local e servidor central.
- Implementar assinatura digital do laudo.
- Adicionar testes E2E para cadastro de protocolo, edicao de laudo e impressao de etiqueta.
