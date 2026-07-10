-- =======================================================
-- SCRIPT: Zerar banco e recriar usuários base do sistema
-- Uso: Cole no SQL Editor do Supabase e execute
-- =======================================================

-- 1. Zerar todas as tabelas
DELETE FROM public.whatsapp_messages;
DELETE FROM public.whatsapp_conversations;
DELETE FROM public.contatos_referidos;
DELETE FROM public.pagamentos;
DELETE FROM public.appointments;
DELETE FROM public.referidos;
DELETE FROM public.leads;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- 2. Criar usuários em auth.users (com instance_id obrigatório)
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  phone_change, phone_change_token,
  email_change_token_current, email_change_confirm_status,
  reauthentication_token, is_sso_user,
  created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'vcechella@gmail.com', crypt('Hormone@2024!', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', 0, '', false,
    NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'medico@hormone.com', crypt('Medico@2024!', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', 0, '', false,
    NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'paciente@hormone.com', crypt('Paciente@2024!', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', 0, '', false,
    NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'consultor@hormone.com', crypt('Consultor@2024!', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', 0, '', false,
    NOW(), NOW()
  );

-- 3. Criar perfis com roles corretas
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT id, email, 'Admin',    'admin',   NOW(), NOW() FROM auth.users WHERE email = 'vcechella@gmail.com'
ON CONFLICT (id) DO UPDATE SET name = 'Admin',    role = 'admin',   updated_at = NOW();

INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT id, email, 'Médico',   'doctor',  NOW(), NOW() FROM auth.users WHERE email = 'medico@hormone.com'
ON CONFLICT (id) DO UPDATE SET name = 'Médico',   role = 'doctor',  updated_at = NOW();

INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT id, email, 'Paciente', 'patient', NOW(), NOW() FROM auth.users WHERE email = 'paciente@hormone.com'
ON CONFLICT (id) DO UPDATE SET name = 'Paciente', role = 'patient', updated_at = NOW();

INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT id, email, 'Consultor','sales',   NOW(), NOW() FROM auth.users WHERE email = 'consultor@hormone.com'
ON CONFLICT (id) DO UPDATE SET name = 'Consultor',role = 'sales',   updated_at = NOW();

-- 4. Verificar resultado
SELECT u.email, p.name, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('vcechella@gmail.com','medico@hormone.com','paciente@hormone.com','consultor@hormone.com')
ORDER BY u.email;
