# MongoDB Admin

> Cliente desktop nativo para MongoDB, construído com Rust + Tauri. Leve, rápido e pronto para ambientes cloud.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-BSL%201.1-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

---

## O que é

**MongoDB Admin** é um gerenciador de banco de dados MongoDB de código aberto, leve e de alto desempenho. Diferente de ferramentas baseadas em Electron (como MongoDB Compass), ele é construído com **Tauri** e **Rust**, resultando em binários nativos com consumo de memória até **10x menor**.

Projetado para desenvolvedores que trabalham com MongoDB em qualquer ambiente — local, AWS DocumentDB, Azure CosmosDB ou qualquer instância compatível.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Gerenciamento de Conexões** | Salve e organize conexões por projeto ou ambiente (Dev, Staging, Prod) |
| **CRUD Completo** | Crie, leia, atualize e delete documentos com editor JSON integrado |
| **Smart Filtering** | Clique em qualquer campo da listagem para filtrar instantaneamente por valor |
| **Visualização JSON** | Visualização formatada e colapsável de documentos aninhados |
| **Suporte a Cloud** | Conectividade nativa com AWS DocumentDB e Azure CosmosDB (API Mongo) |
| **Universal** | Compatível com qualquer versão do MongoDB e drivers existentes |

---

## Download

Baixe os binários pré-compilados na aba **[Releases](../../releases)** deste repositório.

| Plataforma | Arquivo |
|---|---|
| **macOS** (Apple Silicon / Intel) | `.dmg` |
| **Windows** | `.msi` ou `.exe` (NSIS) |
| **Linux** | `.AppImage` ou `.deb` |

Após o download, instale normalmente como qualquer aplicativo da sua plataforma.

---

## Como usar

### 1. Adicionar uma conexão

1. Abra o aplicativo
2. Clique em **"+ New Connection"** no painel lateral esquerdo
3. Preencha a URI de conexão (ex: `mongodb://localhost:27017`)
4. Nomeie a conexão e clique em **Salvar**

### 2. Navegar pelos dados

- No painel esquerdo, expanda a conexão para ver os **databases**
- Clique em um database para ver as **coleções**
- Clique em uma coleção para carregar os **documentos**

### 3. Filtrar documentos

- Use a barra de query para filtrar com sintaxe MongoDB (ex: `{ "status": "active" }`)
- Ou clique diretamente em um valor na listagem para aplicar o filtro automaticamente (**Smart Filter**)

### 4. Editar um documento

1. Clique no documento desejado
2. O editor JSON será aberto no painel lateral
3. Edite o conteúdo e clique em **Salvar**

---

## Compilar do código-fonte

### Pré-requisitos

- [Node.js](https://nodejs.org) >= 18
- [Rust](https://rustup.rs) >= 1.70
- [Tauri CLI](https://tauri.app/start/prerequisites/)

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento (hot reload)
npm run tauri dev
```

### Build de produção

Use o script auxiliar que atualiza a versão automaticamente nos 3 arquivos de configuração e compila:

```bash
npm run tauri:build
# ou diretamente:
bash scripts/build.sh
```

Os binários gerados ficam em:

```
src-tauri/target/release/bundle/
├── macos/          → MongoDB Admin.app  +  .dmg
├── windows/        → .msi  /  nsis/*.exe
└── linux/          → .AppImage  /  deb/*.deb
```

### Executar os testes

```bash
# Testes do frontend (vitest)
npm run test:run

# Com relatório de cobertura
npm run test:coverage

# Testes do backend Rust
cd src-tauri && cargo test
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Runtime nativo** | [Tauri v2](https://tauri.app) + Rust |
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Driver MongoDB** | [mongodb crate](https://docs.rs/mongodb) (Rust) |
| **Async runtime** | Tokio |
| **Serialização** | Serde + BSON |
| **Build tool** | Vite |
| **Testes** | Vitest (frontend) + cargo test (backend) |

---

## Licença (BSL 1.1)

Este projeto utiliza a **Business Source License 1.1**. O código é público para garantir transparência e auditoria de segurança.

**Uso Gratuito (Community)**
- Uso pessoal e não comercial
- Até 3 conexões salvas
- Acesso a todas as funcionalidades de CRUD

**Uso Comercial (Pro)**
- Para uso corporativo, remoção do limite de conexões e suporte oficial a ambientes cloud, entre em contato para licença comercial.

---

## Contribuições

Este é um projeto mantido de forma independente. No momento:

- **Pull Requests** não são aceitos
- **Sugestões e bugs** são bem-vindos via [Issues](../../issues)
