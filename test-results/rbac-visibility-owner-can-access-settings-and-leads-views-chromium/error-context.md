# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - paragraph [ref=e4]: Criar Conta
      - heading "Nova Empresa" [level=1] [ref=e5]
      - generic [ref=e6]:
        - textbox "Nome da empresa" [ref=e7]
        - textbox "seu@email.com" [ref=e8]
        - textbox "Senha" [ref=e9]
        - button "Criar conta" [ref=e10] [cursor=pointer]
      - paragraph [ref=e11]:
        - text: Já tem conta?
        - link "Fazer login" [ref=e12] [cursor=pointer]:
          - /url: /login
  - alert [ref=e13]
```