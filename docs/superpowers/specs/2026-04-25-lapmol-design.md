# LAPMOL — Sistema de Gestão de Laboratório de Patologia Molecular

**Data:** 2026-04-25  
**Projeto:** labs-vet  
**Laboratório:** LAPMOL — Laboratório de Patologia Molecular, UEMA  
**Localização:** Prédio de Medicina Veterinária, UEMA, São Luís — MA

---

## Contexto

O LAPMOL é um laboratório universitário da UEMA que realiza análises de patologia molecular para animais. As amostras chegam do HUV (Hospital Universitário Veterinário da UEMA) ou de clínicas e veterinários externos. Não chegam animais vivos — apenas amostras biológicas (tecidos, sangue, swab, fezes, etc.).

O sistema substituirá o controle atual (planilha/papel) e seguirá as diretrizes do professor responsável:
- Offline-first (PWA + SQLite local)
- Implementar modo offline primeiro, sincronização depois
- Testar com poucos usuários antes de migrar tudo
- Última escrita ganha em conflitos offline

Este documento define o design da **versão 1S light** — MVP funcional focado no ciclo de vida da amostra.

---

## Fluxo Central

```
Solicitação recebida (HUV ou externo)
      ↓
Amostra registrada → protocolo gerado + etiqueta QR impressa
      ↓
Amostra em análise (aluno ou coordenador processa)
      ↓
Laudo redigido (aluno, coordenador ou professor)
      ↓
Laudo liberado/assinado (somente coordenador ou professor)
      ↓
Resultado entregue ao solicitante
```

**Status do ciclo de vida de uma amostra:**
`solicitada → recebida → em_análise → laudo_redigido → laudo_liberado → entregue`

---

## Módulos

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral: amostras pendentes, laudos em aberto, estoque crítico, controle de pendências |
| **Amostras** | Núcleo do sistema — registro de protocolo/OS, status, etiqueta QR, busca |
| **Laudos** | Editor de laudo vinculado à amostra — macro, micro, diagnóstico, liberação |
| **Solicitantes** | Veterinários e clínicas que enviam amostras (nome, CRMV, contato) |
| **Tutores** | Proprietários dos animais (separado do solicitante) |
| **Pacientes** | Animais (espécie, raça, idade, sexo, pelagem, tutor) |
| **Estoque** | Insumos do LAPMOL com alerta de quantidade mínima e validade |
| **Usuários** | Professores, coordenadores e alunos |
| **Auditoria** | Log de ações (quem fez o quê e quando) |

**Módulos removidos em relação ao sistema anterior:**
- ~~Laboratórios~~ — é um único lab, o LAPMOL
- ~~Agenda~~ — fora do escopo desta versão
- ~~Requisições internas~~ — fora do escopo desta versão

---

## Perfis de Acesso

| Ação | Professor | Coordenador | Aluno |
|---|---|---|---|
| Cadastrar amostra | ✓ | ✓ | ✓ |
| Redigir laudo | ✓ | ✓ | ✓ |
| Liberar/assinar laudo | ✓ | ✓ | ✗ |
| Gerenciar estoque | ✓ | ✓ | somente leitura |
| Gerenciar usuários | ✓ | ✗ | ✗ |
| Ver auditoria | ✓ | ✓ | ✗ |

---

## Entidades de Dados

### `solicitantes`
Veterinários ou clínicas que solicitam análises ao LAPMOL.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| nome | TEXT NOT NULL | |
| crmv | TEXT | Registro profissional |
| telefone | TEXT | |
| email | TEXT | |
| endereco | TEXT | |
| especies | TEXT | Espécies que mais atende |
| criado_em | TEXT | ISO 8601 |
| atualizado_em | TEXT | ISO 8601 |

### `tutores`
Proprietários dos animais (pode ser diferente do solicitante).

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| nome | TEXT NOT NULL | |
| cpf | TEXT | |
| telefone | TEXT | |
| email | TEXT | |
| cidade | TEXT | |
| endereco | TEXT | |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `pacientes`
Animais cujas amostras são analisadas.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| nome | TEXT NOT NULL | |
| especie | TEXT | Canino, Felino, Equino, etc. |
| raca | TEXT | |
| idade | TEXT | |
| sexo | TEXT | Macho / Fêmea |
| pelagem | TEXT | |
| tutor_id | TEXT FK tutores | |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `amostras`
Núcleo do sistema — cada entrada é um protocolo/OS.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| protocolo | TEXT NOT NULL UNIQUE | Gerado automaticamente (ex: LAPMOL-20260425-001) |
| paciente_id | TEXT FK pacientes | |
| solicitante_id | TEXT FK solicitantes | |
| tipo_exame | TEXT | Livre (PCR, Histopatológico, Citológico, etc.) |
| material | TEXT | Tecido, sangue, swab, fezes, etc. |
| condicao | TEXT | adequada / hemolisada / insuficiente |
| prioridade | TEXT | normal / alta / urgente |
| status | TEXT | solicitada / recebida / em_análise / laudo_redigido / laudo_liberado / entregue |
| data_coleta | TEXT | |
| data_recebimento | TEXT | |
| observacoes | TEXT | Campo livre |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `laudos`
Um laudo por amostra.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| amostra_id | TEXT FK amostras UNIQUE | |
| macro | TEXT | Descrição macroscópica |
| micro | TEXT | Descrição microscópica |
| diagnostico | TEXT | Diagnóstico conclusivo |
| comentarios | TEXT | Recomendações adicionais |
| responsavel | TEXT | Nome do responsável pelo laudo |
| liberado_por | TEXT FK usuarios | Quem assinou/liberou |
| liberado_em | TEXT | Data de liberação |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `financeiro`
Um registro financeiro por amostra (opcional).

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| amostra_id | TEXT FK amostras UNIQUE | |
| preco_centavos | INTEGER | Em centavos para evitar ponto flutuante |
| forma_pagamento | TEXT | Pix, dinheiro, a faturar, etc. |
| status_pagamento | TEXT | aberto / pago / parcial |
| convenio | TEXT | Convênio ou plano, se houver |

### `estoque`
Insumos e reagentes do LAPMOL.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| nome | TEXT NOT NULL | |
| categoria | TEXT | Fixador, Reagente, Coleta, EPI, etc. |
| quantidade | INTEGER | Quantidade atual |
| qtd_minima | INTEGER | Alerta de estoque crítico |
| qtd_maxima | INTEGER | |
| validade | TEXT | Data de vencimento |
| restrito | INTEGER | 0 ou 1 |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `usuarios`
Pessoas com acesso ao sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| nome | TEXT NOT NULL | |
| email | TEXT NOT NULL | |
| perfil | TEXT | professor / coordenador / aluno |
| status | TEXT | ativo / inativo |
| criado_em | TEXT | |
| atualizado_em | TEXT | |

### `auditoria`
Log imutável de ações relevantes.

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | |
| acao | TEXT NOT NULL | Descrição da ação |
| entidade | TEXT | Módulo afetado |
| ator | TEXT | Nome do usuário |
| registrado_em | TEXT | ISO 8601 |

---

## Índices

```sql
idx_amostras_protocolo      -- busca principal por protocolo
idx_amostras_status         -- filtro de pendências no dashboard
idx_amostras_recebimento    -- relatórios por data de recebimento
idx_pacientes_tutor         -- listagem de pacientes por tutor
```

---

## Arquitetura de Componentes

```
src/
├── App.jsx                  (~150 linhas — roteamento e estado global)
├── data.js                  (seed data do LAPMOL)
├── storage.js               (abstração SQLite/localStorage — mantido)
├── qr.js                    (geração QR — mantido)
├── styles.css               (estilos — mantido e revisado)
│
├── components/
│   ├── Nav.jsx              (menu lateral com seções)
│   ├── Modal.jsx            (modal genérico reutilizável)
│   └── StatusBadge.jsx      (badge de status colorido)
│
└── pages/
    ├── Dashboard.jsx        (pendências, amostras recentes, estoque crítico)
    ├── Amostras.jsx         (lista + cadastro + QR + busca por protocolo/animal/tutor)
    ├── Laudos.jsx           (editor de laudo, liberação, exportação PDF)
    ├── Solicitantes.jsx     (veterinários e clínicas externas)
    ├── Tutores.jsx          (proprietários dos animais)
    ├── Pacientes.jsx        (animais com vínculo ao tutor)
    ├── Estoque.jsx          (insumos com alerta de mínimo)
    ├── Usuarios.jsx         (gerenciamento de perfis)
    └── Auditoria.jsx        (log de ações — somente leitura)
```

---

## Estratégia Offline

Seguindo as diretrizes do professor:

| Característica | On-line | Off-line |
|---|---|---|
| Banco de dados | SQLite local via API Node (`localhost:4174`) | `localStorage` (fallback automático) |
| Sincronização | Leitura/escrita direta na API | Periódica ao reconectar |
| Interface | PWA (React + Vite) | PWA + Service Worker (cache do shell) |
| Conflitos | Resolvido na API | Última escrita ganha |

A API local usa `node:sqlite` (experimental, sem dependências externas). O `storage.js` já gerencia a troca transparente entre SQLite e localStorage.

---

## Formato do Protocolo

`LAPMOL-AAAAMMDD-NNN`  
Exemplo: `LAPMOL-20260425-001`

---

## Funcionalidades do MVP (conforme diretrizes do professor)

1. **Cadastro rápido de amostras** — mesmo sem internet
2. **Busca por protocolo, animal ou tutor** — campo único de busca global
3. **Etiquetas com QR Code** — impressão pelo navegador
4. **Editor de laudo** — texto + campos estruturados (macro, micro, diagnóstico)
5. **Exportação em lote para PDF** — via impressão do navegador
6. **Controle de pendências** — amostras sem laudo, laudos não liberados

---

## O que NÃO está no escopo desta versão

- Autenticação real com senha (login demo por seleção de perfil)
- Sincronização entre múltiplas máquinas
- Assinatura digital de laudo
- Agendamentos
- Requisições internas
- Notificações por e-mail
- Integração com outros sistemas da UEMA

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, CSS puro |
| Backend local | Node.js (http nativo), SQLite (`node:sqlite`) |
| Offline | Service Worker, localStorage |
| Dependências externas | nenhuma nova |
