-- ----------------------------------------------------
-- 1. USER PROFILES & AUTHENTICATION
-- ----------------------------------------------------
-- Here is where we catch all the custom user data (Company Name, GST, Mobile) 
-- that users enter into the Signup Form you built.

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  company_name TEXT,
  mobile_number TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) so users only see their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signups from the Next.js form
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, mobile_number, gst_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'mobile_number',
    new.raw_user_meta_data->>'gst_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a signup completely safely lands in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ----------------------------------------------------
-- 2. CRABS SYSTEM CORE TABLES
-- ----------------------------------------------------
-- These are the business logic tables representing your App: Projects, Orders, Items, Measurements, Bills.

-- Projects Table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders / Work Orders Table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Items Table (Catalog within an order)
CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Measurements Book (MB) Table
-- The lifeblood of construction tracking (L x B x D)
CREATE TABLE public.measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  location_description TEXT,
  length DECIMAL(10,3),
  breadth DECIMAL(10,3),
  depth DECIMAL(10,3),
  quantity DECIMAL(12,3) NOT NULL, -- Calculated value
  recorded_by UUID REFERENCES public.profiles(id),
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bills / Invoices Generated Table
CREATE TABLE public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  bill_number TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Example RLS for Projects (Allows Project Owners to see/edit only THEIR projects)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Individual User Access" ON public.projects FOR ALL USING (auth.uid() = owner_id);

-- Note: In a production app you'd add RLS matching project ownership for all tables (Orders, Items, Measurements, etc).
