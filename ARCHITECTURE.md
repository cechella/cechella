# HORMONE ECOSYSTEM — Arquitetura Completa do Sistema

## Visão Geral

O Hormone Ecosystem é uma plataforma SaaS multi-tenant de saúde digital focada em implantes hormonais, servindo três perfis principais: Pacientes, Médicos e Consultores Comerciais, com um painel Admin Master centralizado.

---

## Stack Tecnológico Recomendado

### Frontend
- **Framework:** Next.js 14 (App Router, Server Components)
- **Linguagem:** TypeScript 5.x
- **Estilização:** Tailwind CSS 3.x
- **UI Components:** Radix UI Primitives + componentes customizados
- **Charts:** Recharts
- **Ícones:** Lucide React
- **Animações:** Framer Motion (v2)
- **Forms:** React Hook Form + Zod (validação)
- **State Management:** Zustand (client state) + React Query (server state)
- **Upload de Vídeos:** Uppy + AWS S3 direct upload

### Backend (Opção A — FastAPI)
- **Framework:** FastAPI (Python 3.11+)
- **Auth:** JWT + Refresh Tokens (python-jose)
- **ORM:** SQLAlchemy 2.0 + Alembic (migrations)
- **Cache:** Redis 7.x
- **Task Queue:** Celery + Redis
- **Video Processing:** FFmpeg via subprocess/Celery worker

### Backend (Opção B — Node.js)
- **Framework:** Fastify 4.x
- **Auth:** Passport.js + JWT
- **ORM:** Prisma 5.x
- **Cache:** ioredis
- **Task Queue:** BullMQ

### Banco de Dados
- **Principal:** PostgreSQL 16 (dados transacionais)
- **Cache/Sessions:** Redis 7.x
- **Busca full-text:** PostgreSQL FTS ou Elasticsearch (v2)
- **Analytics:** ClickHouse (v3, para analytics de alta performance)

### Infraestrutura
- **Cloud:** AWS
- **Compute:** ECS Fargate (backend) + Vercel (frontend)
- **Vídeo:** AWS S3 (upload) + AWS CloudFront + AWS MediaConvert (transcodificação)
- **CDN:** AWS CloudFront
- **Email:** AWS SES
- **SMS/WhatsApp:** Twilio ou Z-API
- **Monitoramento:** Datadog ou AWS CloudWatch
- **Logs:** CloudWatch Logs
- **CI/CD:** GitHub Actions

---

## Esquema do Banco de Dados

### Tabela: `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  role        ENUM('patient', 'doctor', 'sales', 'admin', 'lead') NOT NULL,
  status      ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
  avatar_url  TEXT,
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  last_access TIMESTAMPTZ
);
```

### Tabela: `patients`
```sql
CREATE TABLE patients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date  DATE,
  gender      ENUM('M', 'F', 'other'),
  address     JSONB,
  medical_history TEXT,
  consent_lgpd BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ
);
```

### Tabela: `doctors`
```sql
CREATE TABLE doctors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  crm         VARCHAR(20) UNIQUE NOT NULL,
  crm_state   VARCHAR(2),
  specialty   VARCHAR(100),
  clinic_name VARCHAR(255),
  verified    BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ
);
```

### Tabela: `consultants`
```sql
CREATE TABLE consultants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  region      VARCHAR(100),
  team_id     UUID,
  points_xp   INTEGER DEFAULT 0,
  level       INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  ranking_position INTEGER
);
```

### Tabela: `videos`
```sql
CREATE TABLE videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  tags        TEXT[],
  s3_key      VARCHAR(500),
  cf_url      TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status      ENUM('draft', 'processing', 'published', 'scheduled', 'archived'),
  published_at TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  views_count INTEGER DEFAULT 0,
  access_level ENUM('patient', 'doctor', 'all') DEFAULT 'all'
);
```

### Tabela: `video_progress`
```sql
CREATE TABLE video_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id    UUID REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);
```

### Tabela: `documents`
```sql
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  authors     TEXT,
  year        INTEGER,
  type        ENUM('pdf', 'article', 'guideline', 'meta_analysis', 'protocol'),
  category    VARCHAR(100),
  hormone     VARCHAR(100),
  s3_key      VARCHAR(500),
  abstract    TEXT,
  pages       INTEGER,
  access_level ENUM('doctor', 'all') DEFAULT 'doctor',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  downloads_count INTEGER DEFAULT 0
);
```

### Tabela: `courses`
```sql
CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  total_lessons INTEGER,
  duration_minutes INTEGER,
  order_index INTEGER,
  icon        VARCHAR(50),
  is_locked   BOOLEAN DEFAULT FALSE,
  unlock_after_course_id UUID REFERENCES courses(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `course_progress`
```sql
CREATE TABLE course_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0,
  progress_pct DECIMAL(5,2) DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  score       DECIMAL(5,2),
  UNIQUE(user_id, course_id)
);
```

### Tabela: `certificates`
```sql
CREATE TABLE certificates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  cert_code   VARCHAR(50) UNIQUE NOT NULL,
  issued_at   TIMESTAMPTZ DEFAULT NOW(),
  score       DECIMAL(5,2),
  pdf_url     TEXT,
  verified    BOOLEAN DEFAULT TRUE
);
```

### Tabela: `leads`
```sql
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  source      VARCHAR(100),
  stage       ENUM('lead', 'qualified', 'consultation', 'treatment', 'renewal'),
  assigned_to UUID REFERENCES consultants(id),
  potential_value DECIMAL(10,2),
  notes       TEXT,
  is_urgent   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `appointments`
```sql
CREATE TABLE appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  doctor_id   UUID REFERENCES doctors(id),
  consultant_id UUID REFERENCES consultants(id),
  type        ENUM('telemedicine', 'phone', 'whatsapp', 'presential'),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status      ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `forum_posts`
```sql
CREATE TABLE forum_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID REFERENCES users(id),
  title       VARCHAR(500),
  content     TEXT NOT NULL,
  category    VARCHAR(100),
  tags        TEXT[],
  is_pinned   BOOLEAN DEFAULT FALSE,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `clinical_cases`
```sql
CREATE TABLE clinical_cases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code   VARCHAR(50) UNIQUE NOT NULL,
  age_group   VARCHAR(20),
  gender      ENUM('M', 'F'),
  hormone_type VARCHAR(200),
  complaint   TEXT,
  conduct     TEXT,
  evolution   TEXT,
  outcome     ENUM('excellent', 'very_good', 'good', 'moderate', 'poor'),
  tags        TEXT[],
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE
);
```

---

## Mapa de Endpoints da API

### Autenticação
```
POST   /api/auth/login              — Login com email/senha
POST   /api/auth/logout             — Logout e invalidação de token
POST   /api/auth/refresh            — Renovação de access token
POST   /api/auth/forgot-password    — Solicitar reset de senha
POST   /api/auth/reset-password     — Confirmar reset com token
GET    /api/auth/me                 — Dados do usuário autenticado
```

### Usuários
```
GET    /api/users                   — Listar usuários (admin)
POST   /api/users                   — Criar usuário (admin)
GET    /api/users/:id               — Detalhes do usuário
PUT    /api/users/:id               — Atualizar usuário
DELETE /api/users/:id               — Desativar usuário
```

### Conteúdo de Vídeo
```
GET    /api/videos                  — Listar vídeos (com filtros)
POST   /api/videos                  — Criar vídeo (admin)
GET    /api/videos/:id              — Detalhes do vídeo
PUT    /api/videos/:id              — Atualizar vídeo
DELETE /api/videos/:id              — Arquivar vídeo
POST   /api/videos/:id/progress     — Salvar progresso de assistência
GET    /api/videos/presigned-url    — URL assinada para upload no S3
```

### Documentos / Biblioteca
```
GET    /api/documents               — Listar documentos (com filtros)
POST   /api/documents               — Adicionar documento (admin)
GET    /api/documents/:id           — Detalhes do documento
DELETE /api/documents/:id           — Remover documento
POST   /api/documents/:id/download  — Registrar download + retornar URL
```

### Cursos e Certificados
```
GET    /api/courses                 — Listar trilhas
GET    /api/courses/:id             — Detalhes da trilha
GET    /api/courses/progress        — Progresso do usuário autenticado
PUT    /api/courses/:id/progress    — Atualizar progresso
GET    /api/certificates            — Listar certificados do usuário
GET    /api/certificates/:id        — Detalhes e PDF do certificado
POST   /api/certificates/:id/verify — Verificar autenticidade
```

### CRM / Leads
```
GET    /api/leads                   — Listar leads (consultor ou admin)
POST   /api/leads                   — Criar lead
GET    /api/leads/:id               — Detalhes do lead
PUT    /api/leads/:id               — Atualizar lead (etapa, notas)
DELETE /api/leads/:id               — Arquivar lead
PUT    /api/leads/:id/stage         — Mover etapa no kanban
```

### Agendamentos
```
GET    /api/appointments            — Listar agendamentos
POST   /api/appointments            — Criar agendamento
GET    /api/appointments/:id        — Detalhes
PUT    /api/appointments/:id        — Atualizar
DELETE /api/appointments/:id        — Cancelar
GET    /api/appointments/slots      — Slots disponíveis por data
```

### Fórum / Comunidade
```
GET    /api/posts                   — Listar posts
POST   /api/posts                   — Criar post
GET    /api/posts/:id               — Detalhes + replies
POST   /api/posts/:id/reply         — Responder
POST   /api/posts/:id/like          — Curtir
```

### Casos Clínicos
```
GET    /api/cases                   — Listar casos (anonimizados)
POST   /api/cases                   — Criar caso (médico autorizado)
GET    /api/cases/:id               — Detalhes do caso
```

### Analytics (Admin)
```
GET    /api/analytics/overview      — KPIs gerais
GET    /api/analytics/users         — Crescimento de usuários
GET    /api/analytics/engagement    — Engajamento de conteúdo
GET    /api/analytics/funnel        — Funil de conversão
GET    /api/analytics/revenue       — Receita e MRR
```

### Ranking / Gamificação
```
GET    /api/ranking                 — Ranking de consultores
GET    /api/ranking/me              — Posição e stats do usuário
GET    /api/badges                  — Badges do usuário
POST   /api/xp                      — Registrar pontos XP
```

---

## Roadmap MVP → V3

### MVP — Mês 1 a 3
**Objetivo:** Validar produto com primeiros 100 pacientes, 20 médicos e 10 consultores

#### Mês 1 — Fundação
- [ ] Infraestrutura AWS (VPC, RDS, Redis, S3, CloudFront)
- [ ] Backend: autenticação JWT, modelo de usuários, papéis
- [ ] Frontend: landing page, login, 3 dashboards básicos
- [ ] Upload e streaming de vídeos (S3 + CloudFront)
- [ ] Pipeline CI/CD (GitHub Actions → ECS)

#### Mês 2 — Core Features
- [ ] Biblioteca de vídeos com categorias e progresso
- [ ] Biblioteca de PDFs com download controlado
- [ ] Módulo de agendamento (calendário + confirmação por email)
- [ ] CRM básico (kanban de leads, 5 etapas)
- [ ] Notificações por email (AWS SES)

#### Mês 3 — Educação Médica
- [ ] 8 trilhas de formação (Hormone Academy)
- [ ] Sistema de quiz e avaliação
- [ ] Geração de certificados em PDF (template)
- [ ] Fórum médico básico (posts + replies)
- [ ] Casos clínicos anonimizados
- [ ] Painel Admin com KPIs básicos

**Entregáveis MVP:** Plataforma funcional com os 3 universos, deploy em produção, primeiros usuários reais.

---

### V2 — Mês 4 a 6
**Objetivo:** Crescer para 500 pacientes, 80 médicos, 30 consultores. Início da monetização.

#### Features
- [ ] **Videochamadas nativas** (integração Daily.co ou Agora.io para telemedicina)
- [ ] **App Mobile** (React Native — iOS + Android) com notificações push
- [ ] **Gamificação completa** (XP, níveis, badges, streak, ranking)
- [ ] **WhatsApp Bot** (integração Z-API para nurturing automático de leads)
- [ ] **Analytics avançado** (funil de conversão, cohort analysis)
- [ ] **Prontuário eletrônico simples** (histórico hormonal por paciente)
- [ ] **Notas de evolução** (médico documenta progresso pós-implante)
- [ ] **NPS e pesquisa de satisfação** automática (30/90/180 dias pós-implante)
- [ ] **Integração de pagamentos** (Stripe ou Pagar.me para assinaturas)
- [ ] **Cobrança automática** (ciclo de renovação de implante)
- [ ] **Portal do Parceiro** (farmácias/clínicas parceiras)

---

### V3 — Mês 7 a 12
**Objetivo:** Escala nacional. 5.000 pacientes, 300 médicos, 100 consultores. Multi-clínica.

#### Features
- [ ] **Multi-tenancy por clínica** (cada clínica tem seu espaço isolado)
- [ ] **Franquia médica digital** (white-label da plataforma para redes)
- [ ] **IA para personalização de conteúdo** (recomendação baseada em perfil hormonal)
- [ ] **Predição de renovação** (ML para prever quando paciente vai precisar renovar)
- [ ] **Integração com laboratórios** (recebimento automático de exames)
- [ ] **Assinatura eletrônica de documentos** (LGPD, consentimentos)
- [ ] **Telemedicina com prescrição digital** (integração CFM)
- [ ] **Marketplace de insumos** (compra de pellets diretamente pela plataforma)
- [ ] **BI para gestores de clínicas** (dashboards customizáveis)
- [ ] **API pública** (webhooks, integrações com sistemas de gestão externos)
- [ ] **Internacionalização** (espanhol — expansão para América Latina)

---

## Estratégia de Monetização

### Tiers de Assinatura

#### 1. Plano Clínica Essencial — R$ 997/mês
- Até 100 pacientes ativos
- Biblioteca de vídeos (100 títulos)
- CRM básico (1 consultor)
- Agendamento integrado
- Relatórios básicos
- Suporte por e-mail

#### 2. Plano Clínica Profissional — R$ 2.497/mês
- Até 500 pacientes ativos
- Biblioteca completa (sem limite)
- CRM avançado (até 5 consultores)
- Hormone Academy médica (todos os cursos)
- Telemedicina integrada
- Analytics completo
- WhatsApp Bot
- Suporte prioritário (chat)

#### 3. Plano Clínica Enterprise — R$ 4.997/mês
- Pacientes ilimitados
- Consultores ilimitados
- White-label (sua marca na plataforma)
- API de integração
- Gestor de conta dedicado
- Treinamento in-loco
- SLA garantido 99.9%
- Suporte 24/7

#### 4. Plano Rede / Franquia — Sob consulta
- Multi-unidades
- Painel centralizado
- Relatórios consolidados
- Customizações avançadas

### Receitas Adicionais (V2/V3)
- **Marketplace de insumos:** comissão de 8-12% sobre transações
- **Certificações individuais:** R$ 297 por certificado premium (CFM-registrado)
- **Leads qualificados:** R$ 150-300/lead para clínicas fora da rede
- **Cursos avulsos:** R$ 497-1.997 por trilha para médicos sem assinatura

---

## Segurança e Compliance

### LGPD
- Consentimento explícito no cadastro (double opt-in)
- Direito ao esquecimento implementado (soft delete + anonimização)
- Log de todas as operações com dados pessoais
- DPO (Data Protection Officer) designado
- Política de privacidade atualizada

### Dados de Saúde (Sensíveis)
- Criptografia AES-256 para dados de saúde em repouso
- TLS 1.3 para dados em trânsito
- Casos clínicos SEMPRE anonimizados (sem nome, CPF, data de nascimento exata)
- Acesso a prontuários por papel (médico vê apenas seus pacientes)

### Infraestrutura
- VPC privada com subnets públicas/privadas
- RDS em subnet privada (sem acesso público)
- Secrets Manager para credenciais
- WAF (Web Application Firewall) na CloudFront
- Rate limiting nas APIs
- Penetration testing trimestral

---

## Estrutura de Pastas do Projeto

```
hormone-ecosystem/
├── web/                          # Next.js 14 Frontend
│   ├── app/
│   │   ├── (patient)/           # Portal do Paciente
│   │   ├── (medical)/           # Hormone Academy (Médicos)
│   │   ├── (sales)/             # Hormone Sales Academy
│   │   ├── (admin)/             # Painel Admin Master
│   │   ├── api/                 # API Routes (Next.js)
│   │   ├── layout.tsx
│   │   └── page.tsx             # Landing/Login
│   ├── components/
│   │   ├── layout/              # Sidebar, TopBar
│   │   └── ui/                  # Button, Badge, Cards...
│   └── lib/                     # Utils, API client, types
│
├── api/                          # FastAPI Backend
│   ├── routers/                 # Endpoints por domínio
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   ├── services/                # Business logic
│   ├── core/                    # Auth, config, deps
│   └── migrations/              # Alembic migrations
│
├── infra/                        # Terraform / AWS CDK
│   ├── ecs/
│   ├── rds/
│   ├── s3/
│   └── cloudfront/
│
└── docs/                         # Documentação adicional
    ├── API.md
    └── DEPLOY.md
```

---

*Documento gerado em Junho 2024. Versão 1.0.0*
*Hormone Ecosystem — O maior ecossistema digital de implantes hormonais do Brasil*
