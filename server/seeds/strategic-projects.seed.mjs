/**
 * Seed de dados de exemplo para o módulo Meus Projetos (Gestão Estratégica).
 * Cria 3 projetos com fases, tarefas, notas, dependências e links.
 *
 * Uso: node server/seeds/strategic-projects.seed.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL não definida. Execute a partir da raiz do projeto.');
  process.exit(1);
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('🌱 Iniciando seed de Projetos Estratégicos...\n');

  try {
    // Verificar se já existem projetos
    const [existing] = await connection.execute('SELECT COUNT(*) as cnt FROM strategic_projects');
    if (existing[0].cnt > 0) {
      console.log('⚠️  Já existem projetos estratégicos no banco. Pulando seed.');
      await connection.end();
      return;
    }

    // ========================================================================
    // PROJETO 1: Forno de Secagem Industrial
    // ========================================================================
    console.log('📦 Criando Projeto 1: Forno de Secagem Industrial...');

    const [proj1] = await connection.execute(
      `INSERT INTO strategic_projects (code, title, description, category, priority, status, startDate, targetEndDate, budgetPlanned, budgetActual, progress, ownerId, tags, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'PROJ-001',
        'Forno de Secagem Industrial',
        'Projeto de construção e instalação de forno de secagem para coco ralado e farinha de coco. Inclui projeto mecânico, elétrico, construção civil e comissionamento.',
        'equipamento',
        'alta',
        'em_andamento',
        '2026-01-15',
        '2026-06-30',
        '185000.00',
        '42000.00',
        25,
        1,
        JSON.stringify(['equipamento', 'secagem', 'produção', 'CAPEX']),
        1
      ]
    );
    const proj1Id = proj1.insertId;

    // Membro owner
    await connection.execute(
      `INSERT INTO strategic_project_members (projectId, userId, role, addedBy) VALUES (?, ?, ?, ?)`,
      [proj1Id, 1, 'owner', 1]
    );

    // Fases do Projeto 1
    const [fase1_1] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, 'Planejamento e Projeto', 'Definição técnica, orçamentos e aprovação', 0, 'concluida', '2026-01-15', '2026-02-15']
    );
    const fase1_1Id = fase1_1.insertId;

    const [fase1_2] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, 'Construção Civil', 'Base, estrutura metálica e alvenaria', 1, 'em_andamento', '2026-02-16', '2026-04-15']
    );
    const fase1_2Id = fase1_2.insertId;

    const [fase1_3] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, 'Montagem e Comissionamento', 'Instalação do forno, testes e ajustes', 2, 'pendente', '2026-04-16', '2026-06-30']
    );
    const fase1_3Id = fase1_3.insertId;

    // Tarefas do Projeto 1
    const [t1_1] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_1Id, 'PROJ-001-T01', 'Levantar especificações técnicas do forno', 'Definir capacidade (kg/h), temperatura, tipo de combustível, dimensões', 'alta', 'concluida', '2026-01-15', '2026-01-25', '0.00', '0.00', 0, 1]
    );

    const [t1_2] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_1Id, 'PROJ-001-T02', 'Solicitar 3 orçamentos de fabricantes', 'Contatar fornecedores de fornos industriais e solicitar propostas', 'alta', 'concluida', '2026-01-25', '2026-02-10', '0.00', '0.00', 1, 1]
    );

    const [t1_3] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_2Id, 'PROJ-001-T03', 'Preparar base de concreto', 'Fundação 4x6m com profundidade de 40cm', 'alta', 'em_andamento', '2026-02-16', '2026-03-10', '15000.00', '12000.00', 0, 1]
    );

    const [t1_4] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_2Id, 'PROJ-001-T04', 'Construir estrutura metálica de suporte', 'Estrutura em aço carbono para sustentação do forno', 'alta', 'a_fazer', '2026-03-10', '2026-04-01', '25000.00', '0.00', 1, 1]
    );

    const [t1_5] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_3Id, 'PROJ-001-T05', 'Instalar forno e sistema de exaustão', 'Montagem do equipamento e dutos de exaustão', 'critica', 'a_fazer', '2026-04-16', '2026-05-15', '95000.00', '0.00', 0, 1]
    );

    const [t1_6] = await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj1Id, fase1_3Id, 'PROJ-001-T06', 'Realizar testes de comissionamento', 'Testes com carga parcial e plena, ajuste de temperatura', 'critica', 'a_fazer', '2026-05-16', '2026-06-15', '5000.00', '0.00', 1, 1]
    );

    // Notas do Projeto 1
    await connection.execute(
      `INSERT INTO strategic_task_notes (taskId, projectId, content, noteType, createdBy, createdByName)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t1_2.insertId, proj1Id, 'Recebemos 3 propostas: Fornalha Industrial (R$ 85k), TechForno (R$ 95k) e SecaMax (R$ 78k). A SecaMax tem menor preço mas prazo de 120 dias. TechForno oferece assistência técnica inclusa.', 'decisao', 1, 'Hermano']
    );

    await connection.execute(
      `INSERT INTO strategic_task_notes (taskId, projectId, content, noteType, createdBy, createdByName)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t1_3.insertId, proj1Id, 'Chuvas atrasaram a concretagem em 5 dias. Novo prazo: 15/03.', 'problema', 1, 'Hermano']
    );

    await connection.execute(
      `INSERT INTO strategic_task_notes (taskId, projectId, content, noteType, createdBy, createdByName)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t1_3.insertId, proj1Id, 'Custo do concreto ficou R$ 3.000 abaixo do previsto. Economia será redirecionada para a estrutura metálica.', 'valor', 1, 'Hermano']
    );

    // Dependências do Projeto 1
    await connection.execute(
      `INSERT INTO strategic_task_dependencies (taskId, dependsOnTaskId, dependencyType) VALUES (?, ?, ?)`,
      [t1_4.insertId, t1_3.insertId, 'FS'] // Estrutura depende da base
    );
    await connection.execute(
      `INSERT INTO strategic_task_dependencies (taskId, dependsOnTaskId, dependencyType) VALUES (?, ?, ?)`,
      [t1_5.insertId, t1_4.insertId, 'FS'] // Instalação depende da estrutura
    );
    await connection.execute(
      `INSERT INTO strategic_task_dependencies (taskId, dependsOnTaskId, dependencyType) VALUES (?, ?, ?)`,
      [t1_6.insertId, t1_5.insertId, 'FS'] // Comissionamento depende da instalação
    );

    // ========================================================================
    // PROJETO 2: Prensa para Óleo Extra Virgem
    // ========================================================================
    console.log('📦 Criando Projeto 2: Prensa para Óleo Extra Virgem...');

    const [proj2] = await connection.execute(
      `INSERT INTO strategic_projects (code, title, description, category, priority, status, startDate, targetEndDate, budgetPlanned, budgetActual, progress, ownerId, tags, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'PROJ-002',
        'Prensa para Óleo Extra Virgem de Coco',
        'Aquisição e instalação de prensa hidráulica para produção de óleo extra virgem de coco. Inclui pesquisa de fornecedores, adequação do espaço e treinamento da equipe.',
        'equipamento',
        'critica',
        'planejamento',
        '2026-03-01',
        '2026-09-30',
        '320000.00',
        '0.00',
        10,
        1,
        JSON.stringify(['equipamento', 'óleo', 'prensa', 'CAPEX', 'novo-produto']),
        1
      ]
    );
    const proj2Id = proj2.insertId;

    await connection.execute(
      `INSERT INTO strategic_project_members (projectId, userId, role, addedBy) VALUES (?, ?, ?, ?)`,
      [proj2Id, 1, 'owner', 1]
    );

    // Fases do Projeto 2
    const [fase2_1] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, 'Pesquisa e Viabilidade', 'Estudo de mercado, fornecedores e viabilidade financeira', 0, 'em_andamento', '2026-03-01', '2026-04-15']
    );
    const fase2_1Id = fase2_1.insertId;

    const [fase2_2] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, 'Aquisição e Adequação', 'Compra do equipamento e adequação do espaço', 1, 'pendente', '2026-04-16', '2026-07-31']
    );
    const fase2_2Id = fase2_2.insertId;

    // Tarefas do Projeto 2
    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, fase2_1Id, 'PROJ-002-T01', 'Pesquisar fornecedores de prensas hidráulicas', 'Mapear fabricantes nacionais e importados de prensas para extração de óleo de coco', 'alta', 'em_andamento', '2026-03-01', '2026-03-20', '0.00', 0, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, fase2_1Id, 'PROJ-002-T02', 'Elaborar estudo de viabilidade financeira', 'Projeção de custos, receitas e payback do investimento', 'critica', 'a_fazer', '2026-03-15', '2026-04-05', '2000.00', 1, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, fase2_2Id, 'PROJ-002-T03', 'Comprar prensa selecionada', 'Efetuar a compra e acompanhar fabricação/importação', 'critica', 'a_fazer', '2026-04-16', '2026-06-15', '250000.00', 0, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj2Id, fase2_2Id, 'PROJ-002-T04', 'Adequar espaço físico para instalação', 'Preparar piso, elétrica trifásica e hidráulica', 'alta', 'a_fazer', '2026-05-01', '2026-07-15', '45000.00', 1, 1]
    );

    // ========================================================================
    // PROJETO 3: Compra de Insumos — Coco Seco (Safra 2026)
    // ========================================================================
    console.log('📦 Criando Projeto 3: Compra de Insumos — Coco Seco (Safra 2026)...');

    const [proj3] = await connection.execute(
      `INSERT INTO strategic_projects (code, title, description, category, priority, status, startDate, targetEndDate, budgetPlanned, budgetActual, progress, ownerId, tags, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'PROJ-003',
        'Compra de Insumos — Coco Seco (Safra 2026)',
        'Planejamento e execução da compra de coco seco para a safra 2026. Inclui negociação com produtores, logística de transporte e controle de qualidade.',
        'insumo',
        'critica',
        'em_andamento',
        '2026-01-01',
        '2026-12-31',
        '500000.00',
        '125000.00',
        30,
        1,
        JSON.stringify(['insumo', 'coco-seco', 'safra-2026', 'supply-chain']),
        1
      ]
    );
    const proj3Id = proj3.insertId;

    await connection.execute(
      `INSERT INTO strategic_project_members (projectId, userId, role, addedBy) VALUES (?, ?, ?, ?)`,
      [proj3Id, 1, 'owner', 1]
    );

    // Fases do Projeto 3
    const [fase3_1] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, 'Planejamento de Compras', 'Definição de volume, orçamento e fornecedores', 0, 'concluida', '2026-01-01', '2026-02-28']
    );
    const fase3_1Id = fase3_1.insertId;

    const [fase3_2] = await connection.execute(
      `INSERT INTO strategic_phases (projectId, title, description, orderIndex, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, 'Execução — 1º Semestre', 'Compras e recebimentos do 1º semestre', 1, 'em_andamento', '2026-03-01', '2026-06-30']
    );
    const fase3_2Id = fase3_2.insertId;

    // Tarefas do Projeto 3
    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, fase3_1Id, 'PROJ-003-T01', 'Definir volume anual necessário', 'Calcular demanda baseada na projeção de produção 2026', 'critica', 'concluida', '2026-01-01', '2026-01-15', '0.00', '0.00', 0, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, fase3_1Id, 'PROJ-003-T02', 'Negociar contratos com 5 produtores principais', 'Fechar contratos de fornecimento com preço fixo trimestral', 'alta', 'concluida', '2026-01-15', '2026-02-28', '0.00', '0.00', 1, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, fase3_2Id, 'PROJ-003-T03', 'Acompanhar recebimentos de março', 'Monitorar entregas, qualidade e pagamentos do mês', 'alta', 'concluida', '2026-03-01', '2026-03-31', '85000.00', '82000.00', 0, 1]
    );

    await connection.execute(
      `INSERT INTO strategic_tasks (projectId, phaseId, code, title, description, priority, status, startDate, dueDate, estimatedCost, actualCost, orderIndex, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, fase3_2Id, 'PROJ-003-T04', 'Acompanhar recebimentos de abril', 'Monitorar entregas, qualidade e pagamentos do mês', 'alta', 'a_fazer', '2026-04-01', '2026-04-30', '90000.00', '0.00', 1, 1]
    );

    // Links com módulos ERP para Projeto 3
    await connection.execute(
      `INSERT INTO strategic_task_links (taskId, projectId, linkedModule, linkedEntityType, linkedEntityId, linkedEntityLabel, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proj3Id, proj3Id, 'produtores', 'producer', 1, 'Produtor João Silva', 1]
    );

    // Notas do Projeto 3
    await connection.execute(
      `INSERT INTO strategic_task_notes (taskId, projectId, content, noteType, createdBy, createdByName)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [proj3Id, proj3Id, 'Preço médio do coco seco negociado: R$ 1,80/unidade. Meta: manter abaixo de R$ 2,00 durante todo o ano.', 'valor', 1, 'Hermano']
    );

    console.log('\n✅ Seed concluído com sucesso!');
    console.log(`   - 3 projetos criados (PROJ-001, PROJ-002, PROJ-003)`);
    console.log(`   - 7 fases criadas`);
    console.log(`   - 12 tarefas criadas`);
    console.log(`   - 3 notas criadas`);
    console.log(`   - 3 dependências criadas`);
    console.log(`   - 1 link com módulo ERP criado`);
    console.log(`   - 3 membros de projeto criados`);

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
