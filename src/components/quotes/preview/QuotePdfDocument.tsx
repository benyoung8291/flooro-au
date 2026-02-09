import type { Quote } from '@/hooks/useQuotes';
import type { LineItem } from '@/hooks/useQuoteLineItems';
import type { OrganizationBranding } from '@/hooks/useOrganizationBranding';
import type { QuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import { PreviewItemsTable } from './PreviewItemsTable';
import { OptionalGroupSections } from './OptionalGroupSections';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export interface QuotePdfDocumentProps {
  quote: Quote;
  lineItems: LineItem[];
  org: OrganizationBranding | null;
  owner: QuoteOwnerProfile | null;
  settings: QuotePdfSettings;
  showQtyColumn: boolean;
  showUnitPriceColumn: boolean;
  showTotalColumn: boolean;
}

export function QuotePdfDocument({
  quote,
  lineItems,
  org,
  owner,
  settings,
  showQtyColumn,
  showUnitPriceColumn,
  showTotalColumn,
}: QuotePdfDocumentProps) {
  const requiredItems = lineItems.filter(item => !item.is_optional);
  const optionalItems = lineItems.filter(item => item.is_optional);
  const termsText = quote.terms_and_conditions || org?.terms_and_conditions;

  return (
    <div className="quote-print-document">
      {/* ── Letterhead Header ──────────────────────────── */}
      <div className="letterhead-header">
        <div className="letterhead-brand">
          {org?.logo_url && (
            <img src={org.logo_url} alt="Logo" className="letterhead-logo" />
          )}
          <div className="letterhead-info">
            <div className="letterhead-company-name">{org?.name || 'Your Company'}</div>
            {org?.address && <div className="letterhead-detail">{org.address}</div>}
            {org?.phone && <div className="letterhead-detail">Ph: {org.phone}</div>}
            {org?.email && <div className="letterhead-detail">{org.email}</div>}
            {org?.abn && <div className="letterhead-abn">ABN: {org.abn}</div>}
          </div>
        </div>
        <div className="letterhead-meta">
          <table className="meta-table">
            <tbody>
              <tr>
                <td className="meta-label">Qu. Nbr</td>
                <td className="meta-value">{quote.quote_number}</td>
              </tr>
              <tr>
                <td className="meta-label">Date</td>
                <td className="meta-value">{formatDate(quote.created_at)}</td>
              </tr>
              {quote.valid_until && (
                <tr>
                  <td className="meta-label">Valid Until</td>
                  <td className="meta-value">{formatDate(quote.valid_until)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Contact Grid ───────────────────────────────── */}
      <div className="contact-grid">
        {quote.client_name && (
          <div className="contact-box">
            <h3>Quote To</h3>
            <p className="contact-name">{quote.client_name}</p>
            {quote.client_address && <p>{quote.client_address}</p>}
            {quote.client_email && <p>{quote.client_email}</p>}
            {quote.client_phone && <p>Ph: {quote.client_phone}</p>}
          </div>
        )}
        {owner && (
          <div className="contact-box">
            <h3>Prepared By</h3>
            <p className="contact-name">{owner.full_name || 'Team Member'}</p>
            {owner.email && <p>{owner.email}</p>}
            {owner.phone && <p>Ph: {owner.phone}</p>}
          </div>
        )}
      </div>

      {/* ── Title accent bar ─────────────────────────── */}
      {quote.title && (
        <div className="quote-title-bar">
          {quote.title}
        </div>
      )}

      {/* ── Letter Body (Scope/Description) ────────────── */}
      {(quote.description || quote.client_name) && (
        <div className="letter-body">
          {quote.client_name && (
            <p className="letter-greeting">Dear {quote.client_name},</p>
          )}
          {quote.description && (
            <div
              className="letter-content rich-text-content"
              dangerouslySetInnerHTML={{ __html: quote.description }}
            />
          )}
        </div>
      )}

      {/* ── Required Items ─────────────────────────────── */}
      {requiredItems.length > 0 && (
        <>
          <h2 className="section-heading">Quoted Items</h2>
          <PreviewItemsTable
            items={requiredItems}
            settings={settings}
            showQtyColumn={showQtyColumn}
            showUnitPriceColumn={showUnitPriceColumn}
            showTotalColumn={showTotalColumn}
          />
        </>
      )}

      {/* ── Optional Items ─────────────────────────────── */}
      <OptionalGroupSections
        optionalItems={optionalItems}
        baseSubtotal={quote.subtotal}
        taxRate={quote.tax_rate}
        settings={settings}
        showQtyColumn={showQtyColumn}
        showUnitPriceColumn={showUnitPriceColumn}
        showTotalColumn={showTotalColumn}
      />

      {/* ── Totals ─────────────────────────────────────── */}
      <div className="totals-box">
        <div className="totals-row">
          <span>Subtotal</span>
          <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
        </div>
        {quote.tax_rate > 0 && (
          <div className="totals-row">
            <span>GST ({quote.tax_rate}%)</span>
            <span className="font-mono">{formatCurrency(quote.tax_amount)}</span>
          </div>
        )}
        <div className="totals-row grand-total">
          <span>Total (inc. GST)</span>
          <span className="font-mono">{formatCurrency(quote.total_amount)}</span>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────── */}
      {quote.notes && (
        <div className="notes-box">
          <h3>Notes</h3>
          <p>{quote.notes}</p>
        </div>
      )}

      {/* ── Terms ──────────────────────────────────────── */}
      {termsText && (
        <div className="terms-box">
          <h3>Terms & Conditions</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{termsText}</p>
        </div>
      )}

      {/* ── Signature ──────────────────────────────────── */}
      <div className="signature-grid">
        <div className="signature-box">
          <div className="signature-line" />
          <span>Client Signature / Date</span>
        </div>
        <div className="signature-box">
          <div className="signature-line" />
          <span>Company Representative / Date</span>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="document-footer">
        <span>{org?.name || 'Flooro'}</span>
        {org?.abn && <span>ABN: {org.abn}</span>}
        {org?.phone && <span>Ph: {org.phone}</span>}
        {org?.email && <span>{org.email}</span>}
      </div>
    </div>
  );
}
