-- ─────────────────────────── ADMIN SCOPES ───────────────────────────
CREATE TABLE public.admin_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  label text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_admin_scope(_user uuid, _scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.is_owner(_user), false)
      OR public.has_role(_user, 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions ap
        WHERE ap.user_id = _user
          AND (ap.scopes @> ARRAY['*'] OR ap.scopes @> ARRAY[_scope])
      );
$$;
REVOKE EXECUTE ON FUNCTION public.has_admin_scope(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_scope(uuid, text) TO authenticated, service_role;

CREATE POLICY "admin_permissions_read_self_or_system" ON public.admin_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_admin_scope(auth.uid(), 'system'));
CREATE POLICY "admin_permissions_write_system" ON public.admin_permissions
  FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- ───────────────────── SUPPORT ACCESS SESSIONS ─────────────────────
CREATE TABLE public.admin_support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX idx_support_sessions_admin ON public.admin_support_sessions(admin_id, started_at DESC);
CREATE INDEX idx_support_sessions_target ON public.admin_support_sessions(target_user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.admin_support_sessions TO authenticated;
GRANT ALL ON public.admin_support_sessions TO service_role;
ALTER TABLE public.admin_support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_sessions_admin" ON public.admin_support_sessions
  FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'support') OR target_user_id = auth.uid())
  WITH CHECK (public.has_admin_scope(auth.uid(), 'support') AND admin_id = auth.uid());

-- ─────────────────────────────── CRM ───────────────────────────────
CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort int NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_stages_admin" ON public.crm_stages FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'crm')) WITH CHECK (public.has_admin_scope(auth.uid(), 'crm'));

INSERT INTO public.crm_stages(key, label, sort, is_won, is_lost) VALUES
  ('new_lead','New lead',10,false,false),
  ('contacted','Contacted',20,false,false),
  ('interested','Interested',30,false,false),
  ('negotiation','Negotiation',40,false,false),
  ('customer','Customer',50,true,false),
  ('active','Active',60,true,false),
  ('lost','Lost',70,false,true);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'business',
  name text NOT NULL,
  email text,
  phone text,
  company text,
  country text,
  city text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'new_lead' REFERENCES public.crm_stages(key) ON UPDATE CASCADE,
  source text,
  value_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  owner_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  next_follow_up_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_leads_stage ON public.crm_leads(stage, created_at DESC);
CREATE INDEX idx_crm_leads_vendor ON public.crm_leads(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_leads_admin" ON public.crm_leads FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'crm')) WITH CHECK (public.has_admin_scope(auth.uid(), 'crm'));

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_activities_admin" ON public.crm_activities FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'crm')) WITH CHECK (public.has_admin_scope(auth.uid(), 'crm'));

-- ────────────────────────── SUPPORT CASES ──────────────────────────
CREATE TABLE public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_cases_status ON public.support_cases(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_cases TO authenticated;
GRANT ALL ON public.support_cases TO service_role;
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_cases_admin" ON public.support_cases FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'support')) WITH CHECK (public.has_admin_scope(auth.uid(), 'support'));
CREATE POLICY "support_cases_own_read" ON public.support_cases FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "support_cases_own_create" ON public.support_cases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ───────────────────────── ADVERTISING ─────────────────────────────
CREATE TABLE public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  duration_days int NOT NULL DEFAULT 7,
  is_available boolean NOT NULL DEFAULT true,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_placements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_placements TO authenticated;
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_placements_public_read" ON public.ad_placements FOR SELECT USING (is_available = true);
CREATE POLICY "ad_placements_admin" ON public.ad_placements FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'ads')) WITH CHECK (public.has_admin_scope(auth.uid(), 'ads'));

INSERT INTO public.ad_placements(key,label,description,price_cents,duration_days,sort) VALUES
  ('home_hero','Homepage hero','Full-bleed hero slot on the marketing homepage',150000,7,10),
  ('home_banner','Homepage banner','Secondary banner below the hero',80000,7,20),
  ('feed_sponsored','Feed sponsored post','Native sponsored post in the main feed',60000,7,30),
  ('marketplace_product','Marketplace sponsored product','Boosted product in marketplace results',40000,7,40),
  ('featured_business','Featured business','Business highlighted in discovery',50000,30,50),
  ('featured_vehicle','Featured motorcycle/car','Vehicle highlighted in discovery',35000,14,60),
  ('featured_event','Featured event','Event promoted across the events hub',30000,14,70),
  ('search_promotion','Search results promotion','Top slot for chosen keywords',45000,7,80),
  ('category_promotion','Category promotion','Top slot inside a category',35000,7,90),
  ('push_campaign','Push notification campaign','Targeted push blast',90000,1,100),
  ('sponsored_video','Sponsored video','Sponsored reel placement',70000,7,110),
  ('sponsored_article','Sponsored article','Editorial article slot',65000,30,120),
  ('featured_listing','Featured listing','Premium marketplace listing badge',20000,14,130);

CREATE TABLE public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  objective text NOT NULL DEFAULT 'profile_visits',
  audience text,
  target_countries text[] NOT NULL DEFAULT '{}',
  target_cities text[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  budget_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  placements text[] NOT NULL DEFAULT '{}',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  cta_label text,
  cta_url text,
  contact_info text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  price_cents bigint,
  service_fee_cents bigint,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  invoice_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_requests_status ON public.ad_requests(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_requests TO authenticated;
GRANT ALL ON public.ad_requests TO service_role;
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_requests_admin" ON public.ad_requests FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'ads')) WITH CHECK (public.has_admin_scope(auth.uid(), 'ads'));
CREATE POLICY "ad_requests_own_read" ON public.ad_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid());
CREATE POLICY "ad_requests_own_create" ON public.ad_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');

-- ───────────────────────────── INVOICES ────────────────────────────
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'service',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents bigint NOT NULL DEFAULT 0,
  tax_cents bigint NOT NULL DEFAULT 0,
  discount_cents bigint NOT NULL DEFAULT 0,
  fee_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_status ON public.invoices(status, issued_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_admin" ON public.invoices FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'finance')) WITH CHECK (public.has_admin_scope(auth.uid(), 'finance'));
CREATE POLICY "invoices_own_read" ON public.invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,
  sort int NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_admin" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'finance')) WITH CHECK (public.has_admin_scope(auth.uid(), 'finance'));
CREATE POLICY "invoice_items_own_read" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));

ALTER TABLE public.ad_requests
  ADD CONSTRAINT ad_requests_invoice_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- ─────────────────────────────── ERP ───────────────────────────────
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text, phone text, country text, city text, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_admin" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text, city text, address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warehouses_admin" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  sku text,
  name text NOT NULL,
  qty_on_hand numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  cost_cents bigint NOT NULL DEFAULT 0,
  price_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_items_vendor ON public.stock_items(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_items_admin" ON public.stock_items FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'adjustment',
  qty numeric NOT NULL,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(stock_item_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_admin" ON public.stock_movements FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  total_cents bigint NOT NULL DEFAULT 0,
  expected_at date,
  received_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders_admin" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_po_items_po ON public.purchase_order_items(purchase_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_items_admin" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'erp')) WITH CHECK (public.has_admin_scope(auth.uid(), 'erp'));

-- ─────────────────────────────── CMS ───────────────────────────────
CREATE TABLE public.cms_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL,
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cms_banners_slot ON public.cms_banners(slot, sort);
GRANT SELECT ON public.cms_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_banners TO authenticated;
GRANT ALL ON public.cms_banners TO service_role;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_banners_public_read" ON public.cms_banners FOR SELECT USING (is_active = true);
CREATE POLICY "cms_banners_admin" ON public.cms_banners FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'content')) WITH CHECK (public.has_admin_scope(auth.uid(), 'content'));

CREATE TABLE public.cms_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_articles TO authenticated;
GRANT ALL ON public.cms_articles TO service_role;
ALTER TABLE public.cms_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_articles_public_read" ON public.cms_articles FOR SELECT USING (status = 'published');
CREATE POLICY "cms_articles_admin" ON public.cms_articles FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'content')) WITH CHECK (public.has_admin_scope(auth.uid(), 'content'));

-- updated_at triggers
CREATE TRIGGER trg_admin_permissions_updated BEFORE UPDATE ON public.admin_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_cases_updated BEFORE UPDATE ON public.support_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ad_placements_updated BEFORE UPDATE ON public.ad_placements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_items_updated BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cms_banners_updated BEFORE UPDATE ON public.cms_banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cms_articles_updated BEFORE UPDATE ON public.cms_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();