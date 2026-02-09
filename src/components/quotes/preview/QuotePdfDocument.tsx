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
      {/* ── Header ──────────────────────────────────── */}
      <header className="doc-header">
        <div className="doc-header-left">
          {org?.logo_url && (
            <img src={org.logo_url} alt="Logo" className="doc-logo" />
          )}
          <div className="doc-company-info">
            <div className="doc-company-name">{org?.name || 'Your Company'}</div>
            {org?.address && <div className="doc-company-detail">{org.address}</div>}
            {org?.phone && <div className="doc-company-detail">Ph: {org.phone}</div>}
            {org?.email && <div className="doc-company-detail">{org.email}</div>}
            {org?.abn && <div className="doc-company-detail">ABN: {org.abn}</div>}
          </div>
        </div>
        <div className="doc-header-right">
          <table className="doc-meta-grid">
            <tbody>
              <tr>
                <td className="doc-meta-label-cell">Quote No.</td>
                <td className="doc-meta-value-cell">{quote.quote_number}</td>
              </tr>
              <tr>
                <td className="doc-meta-label-cell">Date</td>
                <td className="doc-meta-value-cell">{formatDate(quote.created_at)}</td>
              </tr>
              {quote.valid_until && (
                <tr>
                  <td className="doc-meta-label-cell">Valid Until</td>
                  <td className="doc-meta-value-cell">{formatDate(quote.valid_until)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </header>

      {/* ── Parties ─────────────────────────────────── */}
      <div className="doc-parties">
        {quote.client_name && (
          <div className="doc-party-block">
            <div className="doc-party-label">Quote To</div>
            <div className="doc-party-name">{quote.client_name}</div>
            {quote.client_address && <div className="doc-party-detail">{quote.client_address}</div>}
            {quote.client_email && <div className="doc-party-detail">{quote.client_email}</div>}
            {quote.client_phone && <div className="doc-party-detail">{quote.client_phone}</div>}
          </div>
        )}
        <div className="doc-party-block">
          {owner && (
            <>
              <div className="doc-party-label">Prepared By</div>
              <div className="doc-party-name">{owner.full_name || 'Team Member'}</div>
              {owner.email && <div className="doc-party-detail">{owner.email}</div>}
              {owner.phone && <div className="doc-party-detail">{owner.phone}</div>}
            </>
          )}
          {quote.client_address && (
            <div className="doc-site-location">
              <span className="doc-party-label">Site Location</span>
              <div className="doc-party-detail">{quote.client_address}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quote Title Banner ──────────────────────── */}
      {quote.title && (
        <div className="doc-quote-title">{quote.title}</div>
      )}

      {/* ── Scope / Description ─────────────────────── */}
      {(quote.description || quote.client_name) && (
        <div className="doc-scope">
          {quote.client_name && (
            <p className="doc-greeting">Dear {quote.client_name},</p>
          )}
          {quote.description && (
            <div
              className="doc-scope-content rich-text-content"
              dangerouslySetInnerHTML={{ __html: quote.description }}
            />
          )}
        </div>
      )}

      {/* ── Required Items ──────────────────────────── */}
      {requiredItems.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-header">
            <h2>Quoted Items</h2>
          </div>
          <PreviewItemsTable
            items={requiredItems}
            settings={settings}
            showQtyColumn={showQtyColumn}
            showUnitPriceColumn={showUnitPriceColumn}
            showTotalColumn={showTotalColumn}
          />
        </div>
      )}

      {/* ── Optional Items ──────────────────────────── */}
      <OptionalGroupSections
        optionalItems={optionalItems}
        baseSubtotal={quote.subtotal}
        taxRate={quote.tax_rate}
        settings={settings}
        showQtyColumn={showQtyColumn}
        showUnitPriceColumn={showUnitPriceColumn}
        showTotalColumn={showTotalColumn}
      />

      {/* ── Totals ──────────────────────────────────── */}
      <div className="doc-totals">
        <div className="doc-totals-table">
          <div className="doc-totals-row">
            <span className="doc-totals-label">Subtotal</span>
            <span className="doc-totals-value">{formatCurrency(quote.subtotal)}</span>
          </div>
          {quote.tax_rate > 0 && (
            <div className="doc-totals-row">
              <span className="doc-totals-label">GST ({quote.tax_rate}%)</span>
              <span className="doc-totals-value">{formatCurrency(quote.tax_amount)}</span>
            </div>
          )}
          <div className="doc-totals-row doc-totals-grand">
            <span className="doc-totals-label">Total (inc. GST)</span>
            <span className="doc-totals-value">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────── */}
      {quote.notes && (
        <div className="doc-notes">
          <h3>Notes</h3>
          <p>{quote.notes}</p>
        </div>
      )}

      {/* ── Terms & Conditions ──────────────────────── */}
      {termsText && (
        <div className="doc-terms">
          <h3>Terms & Conditions</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{termsText}</p>
        </div>
      )}

      {/* ── Acceptance / Signature ──────────────────── */}
      <div className="doc-acceptance">
        <h3>Acceptance</h3>
        <p className="doc-acceptance-text">
          I accept this quote and authorise the commencement of the described works.
        </p>
        <div className="doc-signature-grid">
          <div className="doc-signature-block">
            <div className="doc-signature-line" />
            <span className="doc-signature-label">Client Name</span>
          </div>
          <div className="doc-signature-block">
            <div className="doc-signature-line" />
            <span className="doc-signature-label">Signature</span>
          </div>
          <div className="doc-signature-block">
            <div className="doc-signature-line" />
            <span className="doc-signature-label">Date</span>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="doc-footer">
        <div className="doc-footer-content">
          {org?.email && <span>{org.email}</span>}
          {org?.phone && <span>{org.phone}</span>}
          {org?.website && <span>{org.website}</span>}
        </div>
      </footer>
    </div>
  );
}
