# PetCore

Projeto React criado a partir do arquivo `FAUNA.jsx`. O protótipo original era um único componente com telas, dados fixos e estilo inline. Esta versão separa a base em um projeto executável com Vite, persistência local, views por laboratório e fluxos completos de cadastro.

## O que foi destrinchado

- `src/data.js`: dados iniciais de laboratórios, tutores, pacientes, exames, agenda, estoque, usuários e auditoria.
- `src/storage.js`: persistência em `localStorage`, mantendo os cadastros salvos no navegador.
- `src/App.jsx`: shell da aplicação, dashboard, CRUD genérico, views por laboratório, upload de anexos, modais, relatórios e auditoria.
- `src/styles.css`: camada visual responsiva, com layout de sistema operacional e sem depender de CSS inline.

## Fluxos E2E implementados

- Cadastro, edição, filtro, busca e exclusão de tutores.
- Cadastro, edição, filtro, busca e exclusão de pacientes.
- Vínculo de pacientes com tutores e laboratórios.
- Solicitação e acompanhamento de exames.
- Inserção de arquivos PDF e imagens em pacientes e exames.
- Visão individual de cada laboratório com pacientes, exames, agenda, estoque e arquivos.
- Agenda de consultas, coletas e procedimentos.
- Controle de estoque com mínimo, capacidade, validade e item controlado.
- Cadastro de laboratórios e usuários.
- Dashboard calculado a partir dos registros.
- Relatórios por laboratório.
- Auditoria automática para criação, edição e exclusão.
- Exportação da base em JSON e restauração dos dados demonstrativos.

## Como rodar

```bash
npm install
npm run dev
```

Depois acesse o endereço exibido pelo Vite, normalmente `http://127.0.0.1:5173`.

## Acesso de demonstração

- Usuário: `ewaldo.santana@uema.br`
- Senha: `petcore@2026`

## Próximos passos naturais

- Trocar `localStorage` por API real.
- Criar autenticação com perfis por papel.
- Adicionar upload de laudos e anexos.
- Adicionar testes E2E com Playwright para os fluxos principais.
