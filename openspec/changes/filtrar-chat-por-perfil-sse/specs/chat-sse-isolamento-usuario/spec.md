## ADDED Requirements

### Requirement: Canal SSE de conversas isolado por usuário

O sistema DEVE incluir o identificador do usuário (`id_usuario`) na chave do canal SSE de conversas, de modo que cada usuário autenticado tenha seu próprio canal independente. O `carregarSnapshot` de cada canal DEVE executar a consulta `obterSnapshotConversas` com a sessão do usuário dono do canal, garantindo que a filtragem por perfil (COLABORADOR, GERENTE, EMPRESA) seja aplicada corretamente para todos os assinantes.

#### Scenario: Colaborador e gerente da mesma empresa conectam

- **WHEN** um colaborador e um gerente da mesma empresa abrem o chat com os mesmos parâmetros de busca
- **THEN** cada um recebe apenas os leads filtrados por sua própria sessão (colaborador vê só seus leads; gerente vê todos os leads do PDV)

#### Scenario: Dois colaboradores distintos conectam

- **WHEN** dois colaboradores diferentes da mesma empresa abrem o chat
- **THEN** cada um vê apenas seus próprios leads, sem vazamento de dados entre eles

#### Scenario: Mesmo usuário com buscas diferentes

- **WHEN** o mesmo usuário abre duas abas do chat com termos de busca diferentes
- **THEN** cada aba mantém seu próprio canal com os resultados da sua busca, sem interferência
