import type { EventSlots, SlotId } from '@/lib/booking';
import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { CatalogCategory } from '@/lib/catalog';
import { cloneCatalog, ORIGINAL_CATALOG } from '@/lib/catalog';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';

export type QuoteService = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  pricingType: 'perPerson' | 'fixed' | 'perUnit';
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
};

export type QuoteCustomer = {
  name: string;
  mobile: string;
  eventType: string;
  eventDate: string;
  eventDates?: string[];
  eventSlots?: EventSlots;
  guests: number;
  gstNumber?: string;
  hall: string;
};

export type QuotePricing = {
  foodPerPlate: number;
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  gstNumber: string;
  gstNumberVisible: boolean;
  showCostPerGuest?: boolean;
  eventDates?: string[];
  eventSlots?: EventSlots;
  discountEnabled?: boolean;
  discountPercent?: number;
  discountFlat?: number;
  discountAmount?: number;
  grandTotal: number;
  costPerGuest: number;
};

export type QuoteInput = {
  reference: string;
  customer: QuoteCustomer;
  services: QuoteService[];
  pricing: QuotePricing;
};

export type Quote = QuoteInput & {
  id: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'confirmed' | 'archived';
};

type QuoteRow = {
  id: string;
  reference: string;
  customer_name: string;
  mobile: string;
  event_type: string;
  event_date: string;
  guests: number;
  customer_gst_number: string | null;
  hall: string;
  services: QuoteService[];
  pricing: QuotePricing;
  status: Quote['status'];
  created_at: string;
};

// Several event dates are kept in one text value as 'YYYY-MM-DD,YYYY-MM-DD'.
export function parseEventDates(value: string): string[] {
  return Array.from(new Set((value || '').split(',').map((date) => date.trim()).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))).sort();
}

export function formatEventDates(dates: string[]): string {
  if (!dates.length) return 'Not selected';
  const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', options);
  if (dates.length === 1) return fmt(dates[0], { day: '2-digit', month: 'short', year: 'numeric' });
  const groups = new Map<string, string[]>();
  dates.forEach((date) => groups.set(date.slice(0, 7), [...(groups.get(date.slice(0, 7)) ?? []), date]));
  return Array.from(groups.values()).map((group) => `${group.map((date) => date.slice(8)).join(', ')} ${fmt(group[0], { month: 'short', year: 'numeric' })}`).join(' · ');
}

export function quoteEventDates(customer: { eventDate: string; eventDates?: string[] }): string[] {
  return customer.eventDates && customer.eventDates.length ? customer.eventDates : parseEventDates(customer.eventDate);
}

export const getGetCatalogQueryKey = () => ['supabase', 'catalog'] as const;
export const getListQuotesQueryKey = () => ['supabase', 'quotes'] as const;
export const getGetQuoteQueryKey = (reference: string) => ['supabase', 'quote', reference] as const;

function fromQuoteRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    reference: row.reference,
    customer: {
      name: row.customer_name,
      mobile: row.mobile,
      eventType: row.event_type,
      eventDate: row.event_date,
      eventDates: Array.isArray(row.pricing?.eventDates) && row.pricing.eventDates.length ? row.pricing.eventDates : [row.event_date],
      eventSlots: row.pricing?.eventSlots && typeof row.pricing.eventSlots === 'object' ? row.pricing.eventSlots : {},
      guests: row.guests,
      gstNumber: row.customer_gst_number ?? '',
      hall: row.hall,
    },
    services: Array.isArray(row.services) ? row.services : [],
    pricing: {
      ...row.pricing,
      gstNumber: typeof row.pricing?.gstNumber === 'string' ? row.pricing.gstNumber : '',
      gstNumberVisible: typeof row.pricing?.gstNumberVisible === 'boolean' ? row.pricing.gstNumberVisible : false,
    },
    status: row.status,
    createdAt: row.created_at,
  };
}

export function useGetCatalog() {
  return useQuery<CatalogCategory[]>({
    queryKey: getGetCatalogQueryKey(),
    queryFn: async () => {
      if (!isSupabaseConfigured) return cloneCatalog(ORIGINAL_CATALOG);
      const { data, error } = await requireSupabase().from('catalog').select('categories').eq('id', 'default').maybeSingle();
      if (error) throw error;
      return Array.isArray(data?.categories) ? (data.categories as CatalogCategory[]) : cloneCatalog(ORIGINAL_CATALOG);
    },
    staleTime: 30_000,
  });
}

export function useUpdateCatalog() {
  return useMutation({
    mutationFn: async ({ data }: { data: CatalogCategory[] }) => {
      const client = requireSupabase();
      const { data: saved, error } = await client
        .from('catalog')
        .upsert({ id: 'default', categories: data }, { onConflict: 'id' })
        .select('categories')
        .single();
      if (error) throw error;
      return saved.categories as CatalogCategory[];
    },
  });
}

export function useCreateQuote() {
  return useMutation<Quote, Error, { data: QuoteInput }>({
    mutationFn: async ({ data: input }) => {
      const client = requireSupabase();
      const { data, error } = await client
        .from('quotes')
        .insert({
          reference: input.reference,
          customer_name: input.customer.name,
          mobile: input.customer.mobile,
          event_type: input.customer.eventType,
          event_date: input.customer.eventDate,
          guests: input.customer.guests,
          customer_gst_number: input.customer.gstNumber ?? '',
          hall: input.customer.hall,
          services: input.services,
          pricing: { ...input.pricing, eventDates: input.customer.eventDates ?? [input.customer.eventDate], eventSlots: input.customer.eventSlots ?? {} },
          status: 'new',
        })
        .select('*')
        .single();
      if (error) throw error;
      return fromQuoteRow(data as QuoteRow);
    },
  });
}

export function useListQuotes(params?: { limit?: number }) {
  return useQuery<Quote[]>({
    queryKey: [...getListQuotesQueryKey(), params?.limit ?? 100],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 100);
      if (error) throw error;
      return (data as QuoteRow[]).map(fromQuoteRow);
    },
    enabled: isSupabaseConfigured,
  });
}

export function useGetQuote(
  reference: string,
  options?: { query?: Pick<UseQueryOptions<Quote>, 'enabled' | 'queryKey'> },
) {
  return useQuery<Quote>({
    queryKey: options?.query?.queryKey ?? getGetQuoteQueryKey(reference),
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('quotes').select('*').eq('reference', reference).single();
      if (error) throw error;
      return fromQuoteRow(data as QuoteRow);
    },
    enabled: isSupabaseConfigured && Boolean(reference) && (options?.query?.enabled ?? true),
  });
}

export function useDeleteQuote() {
  return useMutation<void, Error, { reference: string }>({
    mutationFn: async ({ reference }) => {
      const { error } = await requireSupabase().from('quotes').delete().eq('reference', reference);
      if (error) throw error;
    },
  });
}

// Dates and slots already booked (bills ticked "Booked"), without any customer details. Needs supabase/03-availability.sql.
export function useBookedSlots() {
  return useQuery<Record<string, SlotId[]>>({
    queryKey: ['supabase', 'booked-slots'],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('booked_slots');
      if (error) throw error;
      const map: Record<string, SlotId[]> = {};
      ((data ?? []) as { booked_date: string; booked_slots: SlotId[] }[]).forEach((row) => {
        map[row.booked_date] = Array.from(new Set([...(map[row.booked_date] ?? []), ...row.booked_slots]));
      });
      return map;
    },
    enabled: isSupabaseConfigured,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

// Ticking "Booked" in the admin panel marks the bill as confirmed (status = 'confirmed'); unticking returns it to 'new'.
export function useSetQuoteBooked() {
  return useMutation<void, Error, { reference: string; booked: boolean }>({
    mutationFn: async ({ reference, booked }) => {
      const { data, error } = await requireSupabase()
        .from('quotes')
        .update({ status: booked ? 'confirmed' : 'new' })
        .eq('reference', reference)
        .select('reference');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Supabase did not allow this change. Run the file supabase/02-booking-update.sql once in the Supabase SQL Editor, then try again.');
      }
    },
  });
}

export function useAdminSession() {
  return useQuery({
    queryKey: ['supabase', 'admin-session'],
    queryFn: async () => {
      const { data, error } = await requireSupabase().auth.getSession();
      if (error) throw error;
      return data.session;
    },
    enabled: isSupabaseConfigured,
    staleTime: Infinity,
  });
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export function subscribeToAuthChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange(onChange);
  return () => data.subscription.unsubscribe();
}