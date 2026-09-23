import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCatalogQueryKey,
  getListQuotesQueryKey,
  useCreateQuote,
  useGetCatalog,
} from '@/lib/supabase-queries';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Clock3,
  IndianRupee,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import type { EstimatePayload } from '@/lib/estimate-connection';
import { CATALOG_UPDATED_EVENT, cacheCatalog, loadCatalog } from '@/lib/catalog';
import type { CatalogCategory as Category, CatalogItem as Item, CatalogSubcategory as Subcategory } from '@/lib/catalog';
import AdminPage from '@/pages/admin';

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday', 'Anniversary', 'Corporate', 'Other'];
const BANQUET_NAME = 'Swagattam Party Lawns';
const INITIAL_DETAILS = { name: '', mobile: '', eventType: '', otherEventType: '', eventDate: '', guests: '150', billNumber: '', customerGstNumber: '' };
const DRAFT_STORAGE_KEY = 'swagattam-banquet-estimate';
const BRAND_LOGO = `${import.meta.env.BASE_URL}swagattam-logo.webp`;

type Details = typeof INITIAL_DETAILS;
type ValidationErrors = Partial<Record<keyof Details, string>>;
type Line = Item & { categoryName: string; subcategoryName: string; quantity: number; total: number };
type PrintableLine = Pick<Line, 'id' | 'name' | 'description' | 'categoryId' | 'categoryName' | 'subcategoryName' | 'pricingType' | 'quantity' | 'price' | 'total'>;
type PrintData = {
  details: Details;
  lines: PrintableLine[];
  categoryTotals: Record<string, number>;
  foodPerPlate: number;
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  gstNumber: string;
  gstNumberVisible: boolean;
  customerGstNumberVisible: boolean;
  grandTotal: number;
  costPerGuest: number;
  billNumber: string;
};
type CopyStatus = 'idle' | 'copied' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const currency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);
const numberFormat = (amount: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
const displayDate = (date: string) => (date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not selected');
const displayEventType = (details: Details) => details.eventType === 'Other' ? details.otherEventType.trim() || 'Other' : details.eventType;
const BILL_NOTE = 'This is an auto-generated bill and does not require any signature or stamp. It is electronically generated and is valid without a physical signature or company stamp.';

function isFoodCategory(category: string) {
  return category.toLowerCase().includes('food');
}

function serviceRateLabel(pricingType: EstimatePayload['services'][number]['pricingType']) {
  if (pricingType === 'perPerson') return '/ plate';
  if (pricingType === 'perUnit') return '/ unit';
  return 'one-time';
}

function serviceDisplayAmount(service: EstimatePayload['services'][number], showFoodRate = false) {
  return showFoodRate && isFoodCategory(service.category)
    ? `${currency(service.unitPrice)} ${serviceRateLabel(service.pricingType)}`
    : currency(service.total);
}

function categoryIcon(categoryId: string, size = 20) {
  const props = { size, strokeWidth: 1.7 };
  // Keep the category treatment consistent, including for categories added later.
  void categoryId;
  return <Sparkles {...props} />;
}

function pricingLabel(item: Item, categoryId?: string) {
  if (item.pricingType === 'perPerson') return `${currency(item.price)} ${categoryId === 'food' ? '/ plate' : '/ guest'}`;
  if (item.pricingType === 'perUnit') return `${currency(item.price)} / unit`;
  return 'One-time service';
}

function CategoryCard({
  category,
  selections,
  onToggle,
  onQuantityChange,
}: {
  category: Category;
  selections: Record<string, number>;
  onToggle: (item: Item, checked: boolean) => void;
  onQuantityChange: (item: Item, quantity: number) => void;
}) {
  const [open, setOpen] = useState(category.id === 'food');
  const itemCount = category.subcategories.reduce((total, subcategory) => total + subcategory.items.length, 0);
  const selectedCount = category.subcategories.reduce((total, subcategory) => total + subcategory.items.filter((item) => (selections[item.id] ?? 0) > 0).length, 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e5dccd] bg-[#fffdf8]">
      <button
        type="button"
        data-testid={`button-toggle-category-${category.id}`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[76px] w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2e8d3] text-[#864936]">{categoryIcon(category.id)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[1.12rem] font-semibold text-[#243b31]">{category.name}</span>
           <span className="mt-0.5 block text-xs text-[#76746c]">{category.description}</span>
           <span className="mt-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a5b47]">
             {itemCount} {itemCount === 1 ? 'service' : 'services'}{selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
           </span>
        </span>
        {open ? <ChevronDown size={19} className="text-[#864936]" /> : <ChevronRight size={19} className="text-[#864936]" />}
      </button>
      {open && (
        <div className="border-t border-[#eee6d9] px-3 pb-3 sm:px-4 sm:pb-4">
          {category.subcategories.map((subcategory) => (
            <SubcategoryGroup
              key={subcategory.id}
              categoryId={category.id}
              subcategory={subcategory}
              selections={selections}
              onToggle={onToggle}
              onQuantityChange={onQuantityChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SubcategoryGroup({
  categoryId,
  subcategory,
  selections,
  onToggle,
  onQuantityChange,
}: {
  categoryId: string;
  subcategory: Subcategory;
  selections: Record<string, number>;
  onToggle: (item: Item, checked: boolean) => void;
  onQuantityChange: (item: Item, quantity: number) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[#eee6d9] last:border-b-0">
      <button
        type="button"
        data-testid={`button-toggle-subcategory-${subcategory.id}`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[50px] w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={16} className="text-[#9a5b47]" /> : <ChevronRight size={16} className="text-[#9a5b47]" />}
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c6a63]">{subcategory.name}</span>
      </button>
      {open && (
        <div className="space-y-2 pb-3">
          {subcategory.items.map((item) => {
            const quantity = selections[item.id] ?? 0;
            const selected = quantity > 0;
            return (
              <div key={item.id} className={`item-row flex items-center gap-3 rounded-xl border px-3 py-3 ${selected ? 'is-selected' : 'border-[#eee6d9]'}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => onToggle(item, event.target.checked)}
                  className="service-check cursor-pointer"
                  aria-label={`Select ${item.name}`}
                  data-testid={`input-select-item-${item.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-[#263b31]">{item.name}</span>
                    <span className="font-mono text-xs font-bold text-[#864936]">{pricingLabel(item, categoryId)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#77756e]">{item.description}</p>
                </div>
                {selected && item.pricingType === 'perUnit' && (
                  <div className="flex shrink-0 items-center rounded-lg border border-[#dccfbd] bg-[#fffdf8]" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" className="quantity-button rounded-l-lg border-0" onClick={() => onQuantityChange(item, quantity - 1)} aria-label={`Decrease ${item.name}`} data-testid={`button-decrease-${item.id}`}>
                      <Minus size={15} />
                    </button>
                    <span className="min-w-[30px] text-center font-mono text-sm font-bold text-[#263b31]" data-testid={`text-quantity-${item.id}`}>{quantity}</span>
                    <button type="button" className="quantity-button rounded-r-lg border-0" onClick={() => onQuantityChange(item, quantity + 1)} aria-label={`Increase ${item.name}`} data-testid={`button-increase-${item.id}`}>
                      <Plus size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventDetails({
  details,
  errors,
  hallGstNumber,
  customerGstNumber,
  gstNumberVisible,
  customerGstNumberVisible,
  onChange,
  onHallGstNumberChange,
  onCustomerGstNumberChange,
  onGstNumberVisibilityChange,
  onCustomerGstNumberVisibilityChange,
}: {
  details: Details;
  errors: ValidationErrors;
  hallGstNumber: string;
  customerGstNumber: string;
  gstNumberVisible: boolean;
  customerGstNumberVisible: boolean;
  onChange: (field: keyof Details, value: string) => void;
  onHallGstNumberChange: (value: string) => void;
  onCustomerGstNumberChange: (value: string) => void;
  onGstNumberVisibilityChange: (visible: boolean) => void;
  onCustomerGstNumberVisibilityChange: (visible: boolean) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <section className="selection-card page-enter rounded-2xl border border-[#e4dacc] p-4 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a5b47]">01 / Start with the occasion</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-[#263b31]">Event details</h2>
          <p className="mt-1 text-sm text-[#74736c]">A few details help us shape a useful first estimate.</p>
        </div>
        <CalendarDays size={22} className="mt-1 shrink-0 text-[#9a5b47]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" required error={errors.name}>
          <input value={details.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. Kavya Mehta" className="field-control h-12 w-full rounded-xl px-3 text-sm" data-testid="input-customer-name" />
        </Field>
        <Field label="Mobile number" required error={errors.mobile} hint="10 digit mobile number">
          <input value={details.mobile} onChange={(e) => onChange('mobile', e.target.value.replace(/[^\d+ ]/g, '').slice(0, 14))} inputMode="tel" placeholder="e.g. 98765 43210" className="field-control h-12 w-full rounded-xl px-3 text-sm" data-testid="input-mobile-number" />
        </Field>
        <Field label="Event type" required error={errors.eventType}>
          <select value={details.eventType} onChange={(e) => onChange('eventType', e.target.value)} className="field-control h-12 w-full rounded-xl px-3 text-sm" data-testid="select-event-type">
            <option value="">Choose event type</option>
            {EVENT_TYPES.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
          </select>
        </Field>
        {details.eventType === 'Other' && (
          <Field label="What occasion are you planning?" required error={errors.otherEventType} hint="Please describe the occasion">
            <input
              value={details.otherEventType}
              onChange={(e) => onChange('otherEventType', e.target.value.slice(0, 80))}
              placeholder="e.g. Naming ceremony"
              maxLength={80}
              className="field-control h-12 w-full rounded-xl px-3 text-sm"
              data-testid="input-other-event-type"
              aria-label="Other occasion"
            />
          </Field>
        )}
        <Field label="Event date" required error={errors.eventDate}>
          <input type="date" min={today} value={details.eventDate} onChange={(e) => onChange('eventDate', e.target.value)} className="field-control h-12 w-full rounded-xl px-3 text-sm" data-testid="input-event-date" />
        </Field>
        <Field label="Number of guests" required error={errors.guests} hint="Food items are priced per guest">
          <div className="relative">
            <UsersRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a5b47]" />
            <input type="number" min="1" step="1" value={details.guests} onChange={(e) => onChange('guests', e.target.value.replace(/[^\d]/g, '').slice(0, 5))} className="field-control h-12 w-full rounded-xl pl-10 pr-3 text-sm" data-testid="input-guest-count" />
          </div>
        </Field>
         <Field label="Bill No" required error={errors.billNumber} hint="Enter manually">
           <input
             value={details.billNumber}
             onChange={(e) => onChange('billNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
             inputMode="numeric"
             placeholder="e.g. 1001"
             className="field-control h-12 w-full rounded-xl px-3 text-sm"
             data-testid="input-bill-number"
             aria-label="Bill number"
           />
         </Field>
         <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
         <Field label="Hall GST number" hint="Optional · shown on the bill">
           <div className="space-y-2">
             <input
               value={hallGstNumber}
               onChange={(e) => onHallGstNumberChange(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))}
               placeholder="e.g. 22AAAAA0000A1Z5"
               maxLength={15}
               className="field-control h-12 w-full rounded-xl px-3 text-sm uppercase"
               data-testid="input-hall-gst-number"
               aria-label="Hall GST number"
             />
             <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#5f655e]">
               <input
                 type="checkbox"
                 checked={gstNumberVisible}
                 onChange={(e) => onGstNumberVisibilityChange(e.target.checked)}
                 className="size-4 accent-[#864936]"
                 data-testid="input-gst-number-visible"
               />
               Show on bill
             </label>
           </div>
         </Field>
        <Field label="Customer GST number" hint="Optional · shown on the bill">
           <div className="space-y-2">
             <input
               value={customerGstNumber}
               onChange={(e) => onCustomerGstNumberChange(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))}
               placeholder="e.g. 22AAAAA0000A1Z5"
               maxLength={15}
               className="field-control h-12 w-full rounded-xl px-3 text-sm uppercase"
               data-testid="input-customer-gst-number"
               aria-label="Customer GST number"
             />
             <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#5f655e]">
               <input
                 type="checkbox"
                 checked={customerGstNumberVisible}
                 onChange={(e) => onCustomerGstNumberVisibilityChange(e.target.checked)}
                 className="size-4 accent-[#864936]"
                 data-testid="input-customer-gst-number-visible"
               />
               Show on bill
             </label>
           </div>
        </Field>
         </div>
      </div>
    </section>
  );
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#5f655e]">
        <span>{label}{required && <span className="ml-1 text-[#9a5b47]">*</span>}</span>
        {hint && !error && <span className="normal-case font-normal tracking-normal text-[#8b887f]">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-[#a13d32]" data-testid={`error-${label.toLowerCase().replaceAll(' ', '-')}`}>{error}</span>}
    </label>
  );
}

function SummaryPanel({
  catalog,
  details,
  lines,
  categoryTotals,
  foodPerPlate,
  subtotal,
  gstEnabled,
  gstRate,
  gstAmount,
  grandTotal,
  costPerGuest,
  onGstChange,
  onGstRateChange,
  onPrint,
  onPrintSaved,
  onCopy,
  copyStatus,
  onWhatsApp,
  onReset,
  onSaveEstimate,
  saveStatus,
  savedEstimate,
}: {
  catalog: Category[];
  details: Details;
  lines: Line[];
  categoryTotals: Record<string, number>;
  foodPerPlate: number;
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  costPerGuest: number;
  onGstChange: (enabled: boolean) => void;
  onGstRateChange: (rate: number) => void;
  onPrint: () => void;
  onPrintSaved: () => void;
  onCopy: () => void;
  copyStatus: CopyStatus;
  onWhatsApp: () => void;
  onReset: () => void;
  onSaveEstimate: () => void;
  saveStatus: SaveStatus;
  savedEstimate: EstimatePayload | null;
}) {
  return (
    <aside id="estimate-summary" className="summary-panel relative overflow-hidden rounded-2xl p-5 sm:p-6 lg:sticky lg:top-5" data-testid="panel-estimate-summary">
      <div className="relative">
        <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#e2bf72]">Live estimate</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">Your celebration</h2>
            <p className="mt-1 text-xs text-[#c5c9bf]">Updates as you make each choice.</p>
          </div>
          <span className="grid size-10 place-items-center rounded-full border border-[#b89555]/50 text-[#e2bf72]"><IndianRupee size={17} /></span>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-white/15 py-5 text-sm">
          <SummaryDetail label="Customer" value={details.name || 'Awaiting name'} />
          <SummaryDetail label="Occasion" value={displayEventType(details) || 'Awaiting event'} />
          <SummaryDetail label="Date" value={displayDate(details.eventDate)} />
          <SummaryDetail label="Guests" value={details.guests ? `${numberFormat(Number(details.guests))} guests` : 'Not selected'} />
          <div className="col-span-2"><SummaryDetail label="Mobile number" value={details.mobile || 'Awaiting mobile number'} /></div>
        </div>

        <div className="border-b border-white/15 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#c5c9bf]">Selected services</span>
            <span className="font-mono text-[11px] text-[#e2bf72]" data-testid="text-selected-count">{lines.length} {lines.length === 1 ? 'item' : 'items'}</span>
          </div>
          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 px-3 py-4 text-center text-xs leading-relaxed text-[#aeb7ac]">
              Your estimate will appear here as you select services.
            </div>
          ) : (
            <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-3 text-sm" data-testid={`summary-line-${line.id}`}>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#f7f0e2]">{line.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#9fa99e]">{line.categoryName} / {line.subcategoryName} · {line.pricingType === 'perPerson' ? `${numberFormat(Number(details.guests) || 0)} guests` : `Qty ${line.quantity}`}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-[#f1d58e]">{line.categoryId === 'food' ? `${currency(line.price)} ${serviceRateLabel(line.pricingType)}` : currency(line.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-white/15 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#c5c9bf]">Category totals</span>
            <span className="font-mono text-[11px] text-[#9fa99e]">{currency(subtotal)}</span>
          </div>
          <div className="space-y-2">
            {catalog.filter((category) => categoryTotals[category.id] > 0).map((category) => (
              <div key={category.id} className="flex items-center justify-between text-sm">
                <span className="text-[#d2d7cd]">{category.name}</span>
                <span className="font-mono text-xs text-[#f1d58e]" data-testid={`text-category-total-${category.id}`}>{currency(categoryTotals[category.id])}</span>
              </div>
            ))}
            {subtotal === 0 && <p className="text-xs text-[#9fa99e]">No services selected yet.</p>}
          </div>
          {foodPerPlate > 0 && (
            <div className="mt-4 rounded-xl bg-white/8 px-3 py-3">
              <div className="flex items-center justify-between text-xs text-[#c5c9bf]"><span>Food price per plate</span><span className="font-mono font-bold text-[#f1d58e]" data-testid="text-food-price-per-plate">{currency(foodPerPlate)}</span></div>
            </div>
          )}
        </div>

        <div className="space-y-3 py-5">
          <div className="flex items-center justify-between text-sm text-[#d2d7cd]"><span>Subtotal</span><span className="font-mono text-xs">{currency(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-[#d2d7cd]">
              <input type="checkbox" checked={gstEnabled} onChange={(e) => onGstChange(e.target.checked)} className="size-4 accent-[#d6ae60]" data-testid="input-gst-enabled" />
              GST
            </label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="28" step="0.5" value={gstRate} disabled={!gstEnabled} onChange={(e) => onGstRateChange(Math.min(28, Math.max(0, Number(e.target.value))))} className="h-8 w-16 rounded-md border border-white/20 bg-white/10 px-2 text-right font-mono text-xs text-white disabled:opacity-40" aria-label="GST percentage" data-testid="input-gst-rate" />
              <span className="font-mono text-xs text-[#9fa99e]">= {currency(gstAmount)}</span>
            </div>
          </div>
          <div className="border-t border-[#c19a56]/40 pt-4">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs uppercase tracking-[0.13em] text-[#c5c9bf]">Grand total</p><p className="mt-1 text-xs text-[#9fa99e]">Estimated for your event</p></div>
              <span className="font-mono text-2xl font-bold tracking-tight text-[#f1d58e]" data-testid="text-grand-total">{currency(grandTotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/8 px-3 py-2 text-xs"><span className="text-[#b7c0b4]">Cost per guest</span><span className="font-mono font-bold text-[#f7f0e2]" data-testid="text-cost-per-guest">{currency(costPerGuest)}</span></div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
           <button type="button" onClick={onPrint} className="estimate-action-button estimate-action-button--primary" data-testid="button-print-estimate"><Printer size={16} /> Print estimate</button>
          <button type="button" onClick={onCopy} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-semibold text-[#f7f0e2] transition hover:bg-white/10" data-testid="button-copy-estimate"><Copy size={16} /> {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy summary'}</button>
           <button type="button" onClick={onWhatsApp} className="estimate-action-button estimate-action-button--whatsapp" data-testid="button-send-whatsapp"><Send size={16} /> Send on WhatsApp</button>
           <button type="button" onClick={onSaveEstimate} disabled={saveStatus === 'saving' || saveStatus === 'saved'} className="estimate-action-button estimate-action-button--primary disabled:cursor-not-allowed disabled:opacity-55" data-testid="button-save-estimate"><Check size={16} /> {saveStatus === 'saving' ? 'Saving estimate' : saveStatus === 'saved' ? 'Estimate saved' : 'Save estimate'}</button>
        </div>
         {saveStatus === 'saved' && <p className="save-status save-status--success mt-3 rounded-lg px-3 py-2 text-center text-xs" role="status" data-testid="status-estimate-saved">Your estimate has been saved. Our team will follow up with you shortly.</p>}
         {saveStatus === 'error' && <p className="save-status save-status--error mt-3 rounded-lg px-3 py-2 text-center text-xs" role="alert" data-testid="status-estimate-save-error">We could not save this estimate right now. You can still print, copy, or send it on WhatsApp.</p>}
         {savedEstimate && <SavedEstimateCard estimate={savedEstimate} onPrint={onPrintSaved} />}
        <button type="button" onClick={onReset} className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs text-[#aeb7ac] transition hover:text-[#f7f0e2]" data-testid="button-reset-estimate"><RotateCcw size={13} /> Reset estimate</button>
      </div>
    </aside>
  );
}

function SavedEstimateCard({ estimate, onPrint }: { estimate: EstimatePayload; onPrint: () => void }) {
  const foodServices = estimate.services.filter((service) => service.category.toLowerCase().includes('food'));
  const otherServices = estimate.services.filter((service) => !service.category.toLowerCase().includes('food'));
  return (
    <section className="saved-estimate-card mt-4 rounded-xl p-3.5 text-xs" data-testid="panel-saved-estimate-details">
       <div className="saved-estimate-card__header flex items-start justify-between gap-3 pb-3">
        <div>
           <p className="saved-estimate-card__title font-bold uppercase tracking-[0.12em]">Saved quotation</p>
           <p className="saved-estimate-card__reference mt-1 text-[11px]">Bill No {estimate.reference}</p>
        </div>
         <Check size={16} className="saved-estimate-card__check shrink-0" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-3">
        <SavedDetail label="Customer" value={estimate.customer.name} />
        <SavedDetail label="Mobile" value={estimate.customer.mobile} />
        <SavedDetail label="Event" value={estimate.customer.eventType} />
        <SavedDetail label="Date" value={displayDate(estimate.customer.eventDate)} />
        <SavedDetail label="Guests" value={numberFormat(estimate.customer.guests)} />
        {estimate.customer.gstNumber && <SavedDetail label="Customer GST" value={estimate.customer.gstNumber} />}
      </div>
       <div className="saved-estimate-card__section border-t pt-3">
         <p className="saved-estimate-card__section-title mb-3 font-bold uppercase tracking-[0.12em]">Itemized bill</p>
        {foodServices.length > 0 && <SavedServiceGroup title="Food & Catering" services={foodServices} guests={estimate.customer.guests} />}
        {otherServices.length > 0 && <SavedServiceGroup title="Additional services" services={otherServices} guests={estimate.customer.guests} />}
        {!estimate.services.length && <p className="text-[#aeb7ac]">No additional services selected.</p>}
      </div>
       <div className="saved-estimate-card__totals mt-3 space-y-1 border-t pt-3">
        <SavedTotal label="Subtotal" value={currency(estimate.pricing.subtotal)} />
        {estimate.pricing.gstEnabled && <SavedTotal label={`GST (${estimate.pricing.gstRate}%)`} value={currency(estimate.pricing.gstAmount)} />}
        <SavedTotal label="Grand total" value={currency(estimate.pricing.grandTotal)} strong />
        <SavedTotal label="Cost per guest" value={currency(estimate.pricing.costPerGuest)} />
      </div>
       <button type="button" onClick={onPrint} className="saved-print-button mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 font-semibold transition" data-testid="button-print-saved-estimate"><Printer size={15} /> Print bill</button>
    </section>
  );
}

function SavedServiceGroup({ title, services, guests }: { title: string; services: EstimatePayload['services']; guests: number }) {
  return (
    <div className="mb-3 last:mb-0">
       <p className="saved-estimate-card__group-title mb-2 text-[10px] font-bold uppercase tracking-[0.1em]">{title}</p>
      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
               <p className="saved-estimate-card__service-name truncate">{service.name}</p>
               <p className="saved-estimate-card__service-meta mt-0.5 text-[10px]">{service.subcategory} · {service.pricingType === 'perPerson' ? `${numberFormat(guests)} guests` : `Qty ${service.quantity}`}</p>
            </div>
             <span className="saved-estimate-card__service-total shrink-0 font-mono">{serviceDisplayAmount(service, true)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedDetail({ label, value }: { label: string; value: string }) {
  return <div><span className="saved-estimate-card__detail-label block text-[9px] uppercase tracking-[0.1em]">{label}</span><span className="saved-estimate-card__detail-value mt-0.5 block truncate">{value || '—'}</span></div>;
}

function SavedTotal({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`saved-estimate-card__total-row flex items-center justify-between gap-3 ${strong ? 'saved-estimate-card__total-row--grand pt-1 font-semibold' : ''}`}><span>{label}</span><span className="font-mono">{value}</span></div>;
}

function SummaryDetail({ label, value }: { label: string; value: string }) {
  return <div data-testid={`summary-detail-${label.toLowerCase()}`}><span className="block text-[10px] uppercase tracking-[0.12em] text-[#9fa99e]">{label}</span><span className="mt-1 block truncate font-medium text-[#f7f0e2]">{value}</span></div>;
}

function PrintServiceTable({ title, lines, details, showLineTotal = true }: { title: string; lines: PrintableLine[]; details: Details; showLineTotal?: boolean }) {
  return (
    <section className="print-service-section">
      <h2 className="mb-2 text-lg font-semibold text-[#263b31]">{title}</h2>
      <table className="print-table">
        <thead><tr><th>Category / subcategory</th><th>Item</th><th>Qty</th><th>Rate</th>{showLineTotal && <th>Total</th>}</tr></thead>
        <tbody>
          {lines.map((line) => <tr key={line.id}><td>{line.categoryName}<span className="print-subcategory">{line.subcategoryName}</span></td><td>{line.name}</td><td>{line.pricingType === 'perPerson' ? `${numberFormat(Number(details.guests))} guests` : line.quantity}</td><td>{currency(line.price)} {serviceRateLabel(line.pricingType)}</td>{showLineTotal && <td>{currency(line.total)}</td>}</tr>)}
        </tbody>
      </table>
    </section>
  );
}

function PrintSheet({ catalog, printData }: { catalog: Category[]; printData: PrintData | null }) {
  if (!printData) return null;
  const { details, lines, categoryTotals, foodPerPlate, subtotal, gstEnabled, gstRate, gstAmount, gstNumber, gstNumberVisible, customerGstNumberVisible, grandTotal, costPerGuest, billNumber } = printData;
  const foodLines = lines.filter((line) => line.categoryId === 'food');
  const otherLines = lines.filter((line) => line.categoryId !== 'food');
  return (
    <main className="print-sheet">
       <div className="print-header flex items-center justify-between gap-6">
         <div className="flex items-center gap-3"><img src={BRAND_LOGO} alt={`${BANQUET_NAME} logo`} className="print-logo" /><div><p className="print-label">Event estimate studio</p><h1 className="mt-1 text-3xl font-semibold text-[#864936]">{BANQUET_NAME}</h1><p className="mt-1 text-xs text-[#6e6a61]">Celebrations, held beautifully.</p></div></div>
         <div className="text-right"><p className="print-label">Prepared on</p><strong className="text-xs">{displayDate(new Date().toISOString().split('T')[0])}</strong><p className="mt-2 print-label">Bill No</p><strong className="text-xs">{billNumber || '—'}</strong></div>
      </div>
       <section className="print-inquiry">
         <h2>Inquiry details</h2>
         <div className="print-inquiry-grid">
           <div><span>Customer</span><strong>{details.name || '—'}</strong></div>
           <div><span>Mobile</span><strong>{details.mobile || '—'}</strong></div>
           <div><span>Event</span><strong>{displayEventType(details) || '—'}</strong></div>
           <div><span>Date</span><strong>{displayDate(details.eventDate)}</strong></div>
           <div><span>Guests</span><strong>{details.guests ? numberFormat(Number(details.guests)) : '—'}</strong></div>
           <div><span>GST</span><strong>{gstEnabled ? `${gstRate}%` : 'Not applied'}</strong></div>
           {gstNumberVisible && gstNumber.trim() && <div><span>Hall GST number</span><strong>{gstNumber}</strong></div>}
           {customerGstNumberVisible && details.customerGstNumber.trim() && <div><span>Customer GST number</span><strong>{details.customerGstNumber}</strong></div>}
         </div>
       </section>
      {foodLines.length > 0 && <PrintServiceTable title="Food & Catering" lines={foodLines} details={details} showLineTotal={false} />}
      {otherLines.length > 0 && <PrintServiceTable title="Additional services" lines={otherLines} details={details} />}
      {!lines.length && <p className="mb-2 text-sm text-[#6e6a61]">No additional services selected.</p>}
      <div className="print-totals">
        {catalog.filter((category) => categoryTotals[category.id] > 0).map((category) => <div className="print-total-row" key={category.id}><span>{category.name}</span><strong>{currency(categoryTotals[category.id])}</strong></div>)}
        {foodPerPlate > 0 && <div className="print-total-row"><span>Food price / plate</span><strong>{currency(foodPerPlate)}</strong></div>}
        <div className="print-total-row"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div>
        {gstEnabled && <div className="print-total-row"><span>GST ({gstRate}%)</span><strong>{currency(gstAmount)}</strong></div>}
        <div className="print-total-row print-grand"><span>Grand total</span><strong>{currency(grandTotal)}</strong></div>
        <div className="print-total-row"><span>Cost per guest</span><strong>{currency(costPerGuest)}</strong></div>
      </div>
       <div className="print-notes"><strong>Notes & terms</strong><br />{BILL_NOTE}</div>
    </main>
  );
}

function EstimatorPage() {
  const [catalog, setCatalog] = useState<Category[]>(() => loadCatalog());
  const [details, setDetails] = useState<Details>(INITIAL_DETAILS);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(5);
  const [hallGstNumber, setHallGstNumber] = useState('');
  const [gstNumberVisible, setGstNumberVisible] = useState(true);
  const [customerGstNumberVisible, setCustomerGstNumberVisible] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedEstimate, setSavedEstimate] = useState<EstimatePayload | null>(null);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const queryClient = useQueryClient();
  const catalogQuery = useGetCatalog();
  const createQuoteMutation = useCreateQuote();

  useEffect(() => {
    if (!catalogQuery.data || !Array.isArray(catalogQuery.data) || catalogQuery.data.length === 0) return;
    // Cloud copy is the source of truth; local storage is only an offline fallback.
    setCatalog(catalogQuery.data);
    cacheCatalog(catalogQuery.data);
  }, [catalogQuery.data]);

  useEffect(() => {
    const refreshCatalog = () => setCatalog(loadCatalog());
    window.addEventListener('storage', refreshCatalog);
    window.addEventListener(CATALOG_UPDATED_EVENT, refreshCatalog);
    return () => {
      window.removeEventListener('storage', refreshCatalog);
      window.removeEventListener(CATALOG_UPDATED_EVENT, refreshCatalog);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as {
          details?: Partial<Details>;
          selections?: Record<string, number>;
          gstEnabled?: boolean;
          gstRate?: number;
          hallGstNumber?: string;
          gstNumberVisible?: boolean;
           customerGstNumberVisible?: boolean;
        };
        if (draft.details) setDetails((current) => ({ ...current, ...draft.details }));
        if (draft.selections && typeof draft.selections === 'object') setSelections(draft.selections);
        if (typeof draft.gstEnabled === 'boolean') setGstEnabled(draft.gstEnabled);
        if (typeof draft.gstRate === 'number' && Number.isFinite(draft.gstRate)) setGstRate(Math.min(28, Math.max(0, draft.gstRate)));
        if (typeof draft.hallGstNumber === 'string') setHallGstNumber(draft.hallGstNumber.slice(0, 15));
        if (typeof draft.gstNumberVisible === 'boolean') setGstNumberVisible(draft.gstNumberVisible);
         if (typeof draft.customerGstNumberVisible === 'boolean') setCustomerGstNumberVisible(draft.customerGstNumberVisible);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
       window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ details, selections, gstEnabled, gstRate, hallGstNumber, gstNumberVisible, customerGstNumberVisible }));
    } catch {
      // The estimator remains usable when browser storage is unavailable.
    }
  }, [details, selections, gstEnabled, gstRate, hallGstNumber, gstNumberVisible, customerGstNumberVisible, isHydrated]);

  const guestCount = Number(details.guests) || 0;
  const lines = useMemo<Line[]>(() => catalog.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items.filter((item) => item.active))).flatMap((item) => {
    const rawQuantity = selections[item.id] ?? 0;
    const quantity = rawQuantity && item.pricingType === 'perUnit'
      ? Math.min(item.maxQuantity, Math.max(item.minQuantity, rawQuantity))
      : rawQuantity;
    if (!quantity) return [];
    const category = catalog.find((entry) => entry.id === item.categoryId);
    const subcategory = category?.subcategories.find((entry) => entry.id === item.subcategoryId);
    const total = item.pricingType === 'perPerson' ? item.price * guestCount : item.price * quantity;
    return [{ ...item, categoryName: category?.name ?? '', subcategoryName: subcategory?.name ?? '', quantity, total }];
  }), [catalog, guestCount, selections]);

  const categoryTotals = useMemo(() => lines.reduce<Record<string, number>>((totals, line) => {
    totals[line.categoryId] = (totals[line.categoryId] || 0) + line.total;
    return totals;
  }, {}), [lines]);
  const foodPerPlate = useMemo(() => lines.filter((line) => line.categoryId === 'food' && line.pricingType === 'perPerson').reduce((sum, line) => sum + line.price, 0), [lines]);
  const subtotal = Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);
  const gstAmount = gstEnabled ? subtotal * (gstRate / 100) : 0;
  const grandTotal = subtotal + gstAmount;
  const costPerGuest = guestCount > 0 ? grandTotal / guestCount : 0;

  const onChange = (field: keyof Details, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onToggle = (item: Item, checked: boolean) => {
    setSelections((current) => {
      const next = { ...current };
      if (checked) next[item.id] = item.pricingType === 'perUnit' ? item.minQuantity : 1;
      else delete next[item.id];
      return next;
    });
  };

  const onQuantityChange = (item: Item, nextQuantity: number) => {
    const quantity = Math.min(item.maxQuantity, Math.max(item.minQuantity, nextQuantity));
    setSelections((current) => ({ ...current, [item.id]: quantity }));
  };

  const validate = () => {
    const nextErrors: ValidationErrors = {};
    if (!details.name.trim()) nextErrors.name = 'Please enter the customer name.';
    const mobileDigits = details.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(mobileDigits.slice(-10))) nextErrors.mobile = 'Enter a valid 10 digit mobile number.';
    if (!details.eventType) nextErrors.eventType = 'Choose an event type.';
    if (details.eventType === 'Other' && !details.otherEventType.trim()) nextErrors.otherEventType = 'Describe the occasion you are planning.';
    if (!details.eventDate) nextErrors.eventDate = 'Choose the event date.';
    else if (details.eventDate < new Date().toISOString().split('T')[0]) nextErrors.eventDate = 'Choose a future date.';
    if (!Number.isInteger(guestCount) || guestCount <= 0) nextErrors.guests = 'Guests must be more than zero.';
    if (!details.billNumber.trim()) nextErrors.billNumber = 'Enter a bill number.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildEstimatePayload = (): EstimatePayload => ({
    reference: details.billNumber.trim(),
    customer: {
      name: details.name,
      mobile: details.mobile,
      eventType: displayEventType(details),
      eventDate: details.eventDate,
      guests: guestCount,
      gstNumber: details.customerGstNumber,
      // The API keeps this legacy field for compatibility; the customer no longer
      // has to provide a venue in the inquiry form.
      hall: BANQUET_NAME,
    },
    services: lines.map((line) => ({
      id: line.id,
      name: line.name,
      category: line.categoryName,
      subcategory: line.subcategoryName,
      pricingType: line.pricingType,
      quantity: line.quantity,
      unitPrice: line.price,
      total: line.total,
    })),
    pricing: { foodPerPlate, subtotal, gstEnabled, gstRate, gstAmount, gstNumber: hallGstNumber, gstNumberVisible, grandTotal, costPerGuest },
  });

  const estimateMessage = () => {
    const payload = buildEstimatePayload();
    const serviceText = payload.services.length ? payload.services.map((service) => `• ${service.name} (${service.pricingType === 'perPerson' ? `${payload.customer.guests} guests` : `qty ${service.quantity}`}): ${isFoodCategory(service.category) ? `${currency(service.unitPrice)} ${serviceRateLabel(service.pricingType)}` : currency(service.total)}`).join('\n') : 'No additional services selected';
     return `Hello ${BANQUET_NAME}, I would like to discuss this quotation.\n\nBill No: ${payload.reference || 'Not assigned'}\nCustomer: ${payload.customer.name || 'Not provided'}\nMobile: ${payload.customer.mobile || 'Not provided'}\nEvent: ${payload.customer.eventType || 'Not provided'}\nDate: ${displayDate(payload.customer.eventDate)}\nGuests: ${payload.customer.guests || 'Not provided'}\n${payload.customer.gstNumber ? `Customer GST number: ${payload.customer.gstNumber}\n` : ''}${payload.pricing.gstNumberVisible && payload.pricing.gstNumber ? `Hall GST number: ${payload.pricing.gstNumber}\n` : ''}\nSelected services:\n${serviceText}\n\nFood price per plate: ${currency(payload.pricing.foodPerPlate)}\nSubtotal: ${currency(payload.pricing.subtotal)}\n${payload.pricing.gstEnabled ? `GST (${payload.pricing.gstRate}%): ${currency(payload.pricing.gstAmount)}\n` : ''}Grand total: ${currency(payload.pricing.grandTotal)}\nCost per guest: ${currency(payload.pricing.costPerGuest)}`;
  };

  const buildPrintData = (payload?: EstimatePayload): PrintData => {
    if (!payload) {
       return { details, lines, categoryTotals, foodPerPlate, subtotal, gstEnabled, gstRate, gstAmount, gstNumber: hallGstNumber, gstNumberVisible, customerGstNumberVisible, grandTotal, costPerGuest, billNumber: details.billNumber };
    }

    const savedLines: PrintableLine[] = payload.services.map((service) => {
      const matchingCategory = catalog.find((category) => category.name.toLowerCase() === service.category.toLowerCase());
      return {
        id: service.id,
        name: service.name,
        description: '',
        categoryId: matchingCategory?.id ?? service.category,
        categoryName: service.category,
        subcategoryName: service.subcategory,
        pricingType: service.pricingType,
        quantity: service.quantity,
        price: service.unitPrice,
        total: service.total,
      };
    });
    const savedCategoryTotals = savedLines.reduce<Record<string, number>>((totals, line) => {
      totals[line.categoryId] = (totals[line.categoryId] || 0) + line.total;
      return totals;
    }, {});
    return {
       details: { name: payload.customer.name, mobile: payload.customer.mobile, eventType: payload.customer.eventType, otherEventType: '', eventDate: payload.customer.eventDate, guests: String(payload.customer.guests), billNumber: payload.reference, customerGstNumber: payload.customer.gstNumber ?? '' },
      lines: savedLines,
      categoryTotals: savedCategoryTotals,
      foodPerPlate: payload.pricing.foodPerPlate,
      subtotal: payload.pricing.subtotal,
      gstEnabled: payload.pricing.gstEnabled,
      gstRate: payload.pricing.gstRate,
      gstAmount: payload.pricing.gstAmount,
      gstNumber: payload.pricing.gstNumber ?? '',
      gstNumberVisible: payload.pricing.gstNumberVisible ?? false,
       customerGstNumberVisible,
      grandTotal: payload.pricing.grandTotal,
      costPerGuest: payload.pricing.costPerGuest,
       billNumber: payload.reference,
    };
  };
  const openPrintDialog = (payload?: EstimatePayload) => {
    setPrintData(buildPrintData(payload));
    window.setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    }, 0);
  };
  const printEstimate = () => openPrintDialog();
  const printSavedEstimate = () => { if (savedEstimate) openPrintDialog(savedEstimate); };
  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) throw new Error('Clipboard access is unavailable.');
  };
  const copyEstimate = async () => {
    try {
      await copyTextToClipboard(estimateMessage());
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    } catch {
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    }
  };
  const sendWhatsApp = () => {
    const digits = details.mobile.replace(/\D/g, '');
    const validMobile = /^[6-9]\d{9}$/.test(digits.slice(-10));
    const target = validMobile ? `91${digits.slice(-10)}` : '';
    const whatsappUrl = target
      ? `https://wa.me/${target}?text=${encodeURIComponent(estimateMessage())}`
      : `https://wa.me/?text=${encodeURIComponent(estimateMessage())}`;
    const popup = window.open(whatsappUrl, '_blank');
    if (!popup) window.location.assign(whatsappUrl);
  };
  const saveEstimate = () => {
    if (!validate()) return;
    const payload = buildEstimatePayload();
    setSaveStatus('saving');
    createQuoteMutation.mutate({ data: payload }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setSavedEstimate(payload);
        void queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetCatalogQueryKey() });
      },
      onError: () => setSaveStatus('error'),
    });
  };
  const resetEstimate = () => {
    if (window.confirm('Reset this estimate? All event details and selections will be cleared.')) {
      setDetails(INITIAL_DETAILS);
      setSelections({});
      setGstEnabled(true);
      setGstRate(5);
      setHallGstNumber('');
      setGstNumberVisible(true);
       setCustomerGstNumberVisible(true);
      setErrors({});
      setCopyStatus('idle');
      setSaveStatus('idle');
      setSavedEstimate(null);
    }
  };

  return (
    <>
      <div className="estimator-app estimator-shell min-h-[100dvh]">
        <header className="brand-header">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
            <div className="flex min-w-0 items-center gap-3">
              <span className="brand-logo-frame">
                <img src={BRAND_LOGO} alt={`${BANQUET_NAME} logo`} className="brand-logo brand-logo--interactive" />
              </span>
              <div className="min-w-0">
                <p className="brand-header__title font-serif text-base font-semibold leading-tight sm:text-lg">{BANQUET_NAME}</p>
                <p className="brand-header__subtitle mt-1 font-mono text-[8px] uppercase tracking-[0.16em] sm:text-[9px]">Event estimate studio</p>
              </div>
            </div>
            <div className="brand-header__meta hidden items-center gap-4 text-xs font-medium sm:flex">
              <span className="brand-header__badge"><Sparkles size={12} /> Signature planning</span>
              <span className="flex items-center gap-2"><Clock3 size={14} className="brand-header__accent" /> Takes about 2 minutes</span>
              {isHydrated && <span className="brand-header__muted">Draft saved on this device</span>}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1380px] px-5 pb-12 sm:px-8 lg:px-12">
          <section className="premium-hero page-enter relative overflow-hidden rounded-[1.5rem] bg-[#263b31] px-5 py-9 text-[#f9f3e7] shadow-[0_20px_60px_rgba(38,59,49,0.16)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="absolute -right-16 -top-24 size-72 rounded-full border border-[#d6ae60]/25" /><div className="absolute -right-2 -top-10 size-52 rounded-full border border-[#d6ae60]/20" />
            <div className="relative max-w-3xl">
              <div className="hero-kicker"><Sparkles size={13} /> Signature celebrations, thoughtfully curated</div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#e2bf72]">Your day, thoughtfully priced</p>
              <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-6xl">Plan the celebration.<br /><span className="text-[#e2bf72]">See it come together.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#cbd1c7] sm:text-base">Choose your menu, styling and finishing touches. Your estimate updates instantly, so every decision feels clear before the first guest arrives.</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#b7c0b4]"><span className="flex items-center gap-2"><Check size={15} className="text-[#e2bf72]" /> No commitment</span><span className="flex items-center gap-2"><Check size={15} className="text-[#e2bf72]" /> Transparent pricing</span><span className="flex items-center gap-2"><Check size={15} className="text-[#e2bf72]" /> Made for your guest count</span></div>
            </div>
          </section>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px] xl:gap-10">
            <div className="space-y-6">
              <EventDetails details={details} errors={errors} hallGstNumber={hallGstNumber} customerGstNumber={details.customerGstNumber} gstNumberVisible={gstNumberVisible} customerGstNumberVisible={customerGstNumberVisible} onChange={onChange} onHallGstNumberChange={setHallGstNumber} onCustomerGstNumberChange={(value) => setDetails((current) => ({ ...current, customerGstNumber: value }))} onGstNumberVisibilityChange={setGstNumberVisible} onCustomerGstNumberVisibilityChange={setCustomerGstNumberVisible} />
               <section className="page-enter stagger-1">
                <div className="mb-5 flex items-end justify-between gap-4 px-1">
                  <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a5b47]">02 / Make it yours</p><h2 className="mt-2 font-serif text-2xl font-semibold text-[#263b31]">Choose your services</h2><p className="mt-1 text-sm text-[#74736c]">Select what you need. We will handle the arithmetic.</p></div>
                  <CircleHelp size={20} className="mb-1 shrink-0 text-[#9a5b47]" />
                </div>
                 {catalogQuery.isLoading && <div className="mb-3 rounded-xl border border-[#e3d8c9] bg-[#fffdf8] px-4 py-3 text-xs text-[#7b776e]" role="status" data-testid="status-catalog-loading">Refreshing the service catalog…</div>}
                 {catalogQuery.isError && <div className="mb-3 rounded-xl border border-[#e8cfc5] bg-[#fff7f3] px-4 py-3 text-xs text-[#8a5144]" role="alert" data-testid="status-catalog-fallback">The live catalog is temporarily unavailable. Showing the latest catalog saved on this device.</div>}
                 {catalog.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d8cbbb] bg-[#fffdf8] p-8 text-center text-sm text-[#77756e]">Services are being refreshed. Please check back shortly.</div> : <div className="space-y-3">{catalog.map((category) => <CategoryCard key={category.id} category={category} selections={selections} onToggle={onToggle} onQuantityChange={onQuantityChange} />)}</div>}
              </section>
            </div>
             <SummaryPanel catalog={catalog} details={details} lines={lines} categoryTotals={categoryTotals} foodPerPlate={foodPerPlate} subtotal={subtotal} gstEnabled={gstEnabled} gstRate={gstRate} gstAmount={gstAmount} grandTotal={grandTotal} costPerGuest={costPerGuest} onGstChange={setGstEnabled} onGstRateChange={setGstRate} onPrint={printEstimate} onPrintSaved={printSavedEstimate} onCopy={copyEstimate} copyStatus={copyStatus} onWhatsApp={sendWhatsApp} onSaveEstimate={saveEstimate} saveStatus={saveStatus} savedEstimate={savedEstimate} onReset={resetEstimate} />
          </div>
        </main>
        <div className="mobile-dock fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-[#ded1bf] bg-[#fffdf8]/90 px-5 py-3 lg:hidden">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77756e]">Grand total</p><p className="font-mono text-lg font-bold text-[#864936]" data-testid="text-mobile-grand-total">{currency(grandTotal)}</p></div>
          <button type="button" onClick={() => document.getElementById('estimate-summary')?.scrollIntoView({ behavior: 'smooth' })} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#864936] px-4 text-sm font-bold text-[#fff6e8]" data-testid="button-view-summary">View summary <ArrowRight size={16} /></button>
        </div>
      </div>
       <PrintSheet catalog={catalog} printData={printData} />
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/111" component={EstimatorPage} />
        <Route path="/999" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}

export default App;