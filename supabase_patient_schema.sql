-- Videos table
CREATE TABLE videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  hls_path TEXT, -- path in Supabase Storage bucket 'videos'
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialty TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  type TEXT DEFAULT 'telemedicina' CHECK (type IN ('telemedicina', 'presencial')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watch history (tracks progress per user per video)
CREATE TABLE watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, video_id)
);

-- Patient journey steps
CREATE TABLE patient_journey (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(patient_id, step_number)
);

-- RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_journey ENABLE ROW LEVEL SECURITY;

-- Videos: all authenticated users can read published videos
CREATE POLICY "Authenticated users can view published videos" ON videos
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);

-- Appointments: patients see own appointments
CREATE POLICY "Patients view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id);

-- Watch history: patients manage own history
CREATE POLICY "Patients manage own watch history" ON watch_history
  FOR ALL USING (auth.uid() = patient_id);

-- Patient journey: patients manage own journey
CREATE POLICY "Patients manage own journey" ON patient_journey
  FOR ALL USING (auth.uid() = patient_id);
