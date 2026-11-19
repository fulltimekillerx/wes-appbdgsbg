-- 1. Create the fg_stock_identity table
CREATE TABLE public.fg_stock_identity (
  lmg_number TEXT NOT NULL,
  plant TEXT NOT NULL,
  so_number TEXT,
  so_item TEXT,
  customer_name TEXT,
  print_design TEXT,
  quantity NUMERIC,
  weight NUMERIC,
  weight_per_pcs NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT fg_stock_identity_pkey PRIMARY KEY (lmg_number, plant)
);

-- 2. Enable Row Level Security
ALTER TABLE public.fg_stock_identity ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for access control
CREATE POLICY "Allow authenticated users to view stock identity"
ON public.fg_stock_identity
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert stock identity"
ON public.fg_stock_identity
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock identity"
ON public.fg_stock_identity
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
