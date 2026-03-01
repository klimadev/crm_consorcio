#!/usr/bin/env node
import { execSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const log = (msg, color = '') => {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };
  console.log(`${colors[color] || ''}${msg}${colors.reset}`);
};

const run = (cmd, opts = {}) => {
  log(`→ ${cmd}`, 'cyan');
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
    return true;
  } catch (e) {
    log(`✗ Erro ao executar: ${cmd}`, 'yellow');
    return false;
  }
};

const question = (q) => new Promise((resolve) => {
  rl.question(q, (ans) => resolve(ans.toLowerCase().trim()));
});

const hasNodeModules = fs.existsSync(path.join(process.cwd(), 'node_modules'));
const hasPrismaDb = fs.existsSync(path.join(process.cwd(), 'prisma', 'dev.db'));

async function main() {
  log('\n🚀 Wizard de Configuração - CRM Consórcio\n', 'green');
  log('=' .repeat(50), 'blue');

  const primeiraInstall = await question(
    '📦 É sua primeira instalação? (s/n): '
  );

  if (primeiraInstall === 's' || primeiraInstall === 'sim' || primeiraInstall === 'y' || primeiraInstall === 'yes') {
    log('\n🌐 Modo: Primeira Instalação\n', 'yellow');

    if (!hasNodeModules) {
      log('\n1/5 - Instalando dependências...', 'blue');
      if (!run('npm install')) {
        log('✗ Falha ao instalar dependências', 'yellow');
        process.exit(1);
      }
    } else {
      log('✓ node_modules já existe, pulando...', 'green');
    }

    log('\n2/5 - Gerando Prisma Client...', 'blue');
    if (!run('npx prisma generate')) {
      log('✗ Falha ao gerar Prisma Client', 'yellow');
      process.exit(1);
    }

    log('\n3/5 - Criando banco de dados...', 'blue');
    if (!run('npx prisma db push')) {
      log('✗ Falha ao criar banco de dados', 'yellow');
      process.exit(1);
    }

    log('\n4/5 - Populando banco com dados iniciais...', 'blue');
    if (!run('npm run seed')) {
      log('✗ Falha ao executar seed', 'yellow');
      process.exit(1);
    }

    log('\n5/5 - Verificando instalação...', 'blue');
    run('npm run lint');

    log('\n✅ Instalação concluída!', 'green');
    log('Execute: npm run dev', 'cyan');
    log('Acesse: http://localhost:3333\n', 'cyan');

  } else {
    log('\n🔄 Modo: Atualização\n', 'yellow');

    log('\n1/4 - Fazendo pull das últimas mudanças...', 'blue');
    if (!run('git pull')) {
      log('✗ Falha ao fazer pull', 'yellow');
      process.exit(1);
    }

    log('\n2/4 - Instalando novas dependências...', 'blue');
    if (!run('npm install')) {
      log('✗ Falha ao instalar dependências', 'yellow');
      process.exit(1);
    }

    log('\n3/4 - Sincronizando banco de dados...', 'blue');
    if (!run('npx prisma db push')) {
      log('✗ Falha ao sincronizar banco', 'yellow');
      process.exit(1);
    }

    log('\n4/4 - Gerando Prisma Client...', 'blue');
    if (!run('npx prisma generate')) {
      log('✗ Falha ao gerar Prisma Client', 'yellow');
      process.exit(1);
    }

    log('\n✅ Atualização concluída!', 'green');
    log('Execute: npm run dev', 'cyan');
    log('Acesse: http://localhost:3333\n', 'cyan');
  }

  rl.close();
}

main().catch((e) => {
  log(`\n✗ Erro inesperado: ${e.message}`, 'yellow');
  process.exit(1);
});
