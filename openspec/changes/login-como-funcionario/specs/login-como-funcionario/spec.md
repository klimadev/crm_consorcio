## ADDED Requirements

### Requirement: Admin can impersonate any funcionario
O sistema SHALL permitir que um usuário com perfil EMPRESA assuma a sessão de qualquer funcionário da mesma empresa diretamente da tela de equipe, sem necessidade de senha.

#### Scenario: Impersonação bem-sucedida
- **WHEN** um admin (EMPRESA) clica em "Login como" em um funcionário ativo da mesma empresa
- **THEN** o servidor cria um token JWT com `id_usuario`, `id_empresa`, `perfil` e `id_pdv` do funcionário alvo, sobrescreve o cookie `crm_consorcio_sessao` e o cliente recarrega a página logado como o alvo

#### Scenario: Admin tenta impersonar funcionário de outra empresa
- **WHEN** um admin tenta impersonar um funcionário cujo `id_empresa` não coincide com o da sessão atual
- **THEN** a API retorna 404 (funcionário não encontrado)

#### Scenario: GERENTE tenta impersonar
- **WHEN** um usuário com perfil GERENTE tenta usar a rota de impersonação
- **THEN** a API retorna 403 (sem permissão)

#### Scenario: COLABORADOR tenta impersonar
- **WHEN** um usuário com perfil COLABORADOR tenta usar a rota de impersonação
- **THEN** a API retorna 403 (sem permissão)

#### Scenario: Funcionário alvo inativo
- **WHEN** um admin tenta impersonar um funcionário que está inativo (`ativo: false`)
- **THEN** a API retorna 404 com mensagem "Funcionário inativo ou não encontrado"

### Requirement: Auditoria de impersonação
O sistema SHALL registrar toda impersonação na tabela `AuditoriaEquipe` com os dados do autor e do alvo.

#### Scenario: Registro de auditoria ao impersonar
- **WHEN** a API processa uma impersonação com sucesso
- **THEN** um registro é criado em `AuditoriaEquipe` com `acao = "LOGIN_COMO_FUNCIONARIO"`, `id_funcionario_alvo = id do alvo`, `autor_tipo = "EMPRESA"`, `autor_id = id do admin`

### Requirement: Botão de impersonação na tela de equipe
O sistema SHALL exibir um botão "Login como" nas listagens de funcionários do módulo equipe, visível exclusivamente para o perfil EMPRESA.

#### Scenario: Admin vê botão em cada funcionário
- **WHEN** um admin acessa `/equipe`
- **THEN** cada linha da tabela desktop e cada card da lista mobile exibe um botão ou ícone para "Login como"

#### Scenario: GERENTE não vê botão
- **WHEN** um gerente acessa `/equipe`
- **THEN** o botão de impersonação não é renderizado em nenhum funcionário

#### Scenario: Loading state durante impersonação
- **WHEN** o admin clica em "Login como"
- **THEN** o botão correspondente exibe um spinner (`Loader2`) e fica desabilitado até a resposta da API

#### Scenario: Erro na impersonação
- **WHEN** a API retorna erro (ex: funcionário não encontrado, sem permissão)
- **THEN** um toast de erro é exibido com a mensagem retornada e o botão volta ao estado normal
