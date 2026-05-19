## ADDED Requirements

### Requirement: Seção de desenvolvimento visível para todos os perfis

O sidebar do sistema DEVE exibir uma seção "DESENVOLVIMENTO" visível para todos os perfis (EMPRESA, GERENTE, COLABORADOR), posicionada abaixo da seção "SISTEMA", contendo um item "Laboratório".

#### Scenario: Todos os perfis veem a seção

- **WHEN** um usuário autenticado com qualquer perfil (EMPRESA, GERENTE ou COLABORADOR) acessa qualquer página do dashboard
- **THEN** a seção "DESENVOLVIMENTO" é exibida no sidebar com o item "Laboratório"

### Requirement: Tratamento visual distinto da seção de desenvolvimento

O item "Laboratório" DEVE ter tratamento visual que o diferencie semanticamente das funcionalidades de produção, utilizando cor âmbar (`text-amber-500`) e um badge "DEV" com fundo âmbar escuro.

#### Scenario: Distinção visual do item de desenvolvimento

- **WHEN** o sidebar é renderizado
- **THEN** o item "Laboratório" utiliza ícone FlaskConical com cor âmbar, badge "DEV" com fundo `bg-amber-900/50` e texto `text-amber-400`, contrastando com os ícones slate/emerald dos demais itens

### Requirement: Proteção por senha ao clicar no laboratório

Ao clicar no item "Laboratório", o sistema DEVE exibir um modal solicitando senha. O clique NÃO DEVE navegar para a rota `/laboratorio` antes da senha ser validada.

#### Scenario: Modal de senha ao clicar

- **WHEN** o usuário clica no item "Laboratório" no sidebar
- **THEN** um modal é exibido com o título "Área do Desenvolvedor", uma descrição informando que são ferramentas experimentais, um campo de senha e um botão "Acessar"

#### Scenario: Senha correta desbloqueia acesso

- **WHEN** o usuário insere a senha correta (igual a `NEXT_PUBLIC_DEV_PASSWORD`) e clica em "Acessar"
- **THEN** o modal fecha e o usuário é redirecionado para `/laboratorio`

#### Scenario: Senha incorreta mostra erro

- **WHEN** o usuário insere uma senha incorreta e clica em "Acessar"
- **THEN** o campo de senha exibe animação de shake, mensagem de erro "Senha incorreta", e o modal permanece aberto

#### Scenario: Fechar modal sem senha

- **WHEN** o usuário clica fora do modal, no botão fechar, ou pressiona Escape
- **THEN** o modal fecha sem navegar para `/laboratorio`

### Requirement: Estado do laboratório não persiste entre recarregamentos

O desbloqueio do laboratório NÃO DEVE persistir entre recarregamentos da página (F5). Após um recarregamento, o usuário DEVE inserir a senha novamente.

#### Scenario: Recarregamento exige nova senha

- **WHEN** o usuário está na página `/laboratorio` e recarrega a página (F5)
- **THEN** a página `/laboratorio` carrega normalmente (a proteção da rota é apenas por sessão, não por senha), mas se o usuário navegar para outra página e tentar voltar ao laboratório pelo sidebar, o modal de senha é exibido novamente

### Requirement: Rota do laboratório acessível a qualquer perfil autenticado

A rota `/laboratorio` DEVE ser acessível a qualquer usuário autenticado (todos os perfis), desde que tenha passado pela verificação de senha.

#### Scenario: Acesso à rota do laboratório

- **WHEN** um usuário autenticado com qualquer perfil acessa `/laboratorio`
- **THEN** a página do laboratório é renderizada com o shell padrão do dashboard

#### Scenario: Acesso sem autenticação redireciona

- **WHEN** um usuário não autenticado tenta acessar `/laboratorio`
- **THEN** é redirecionado para `/login`
