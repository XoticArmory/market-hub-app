import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const DOC_BUCKET = "vendorgrid-documents";

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildMarketReportCsv(eventTitle: string, eventDate: Date, summary: any): string {
  const header = [
    "Item Name",
    "Qty Assigned",
    "Qty Sold",
    "Qty Remaining",
    "Sell Price",
    "Direct COGS/unit",
    "Overhead/unit",
    "Total COGS/unit",
    "Revenue",
    "Gross Profit",
    "Net Profit",
  ].join(",");

  const itemRows = (summary.items ?? []).map((item: any) => {
    const qtyRemaining = (item.quantityAssigned ?? 0) - (item.quantitySold ?? 0);
    return [
      escapeCsv(item.itemName),
      escapeCsv(item.quantityAssigned),
      escapeCsv(item.quantitySold),
      escapeCsv(qtyRemaining),
      escapeCsv(centsToUsd(item.sellPriceCents)),
      escapeCsv(centsToUsd(item.directCogsCents)),
      escapeCsv(centsToUsd(item.overheadPerItemCents)),
      escapeCsv(centsToUsd(item.totalCogsPerItemCents)),
      escapeCsv(centsToUsd(item.revenueCents)),
      escapeCsv(centsToUsd(item.grossProfitCents)),
      escapeCsv(centsToUsd(item.netProfitCents)),
    ].join(",");
  });

  const totalRevenue = (summary.items ?? []).reduce((s: number, i: any) => s + (i.revenueCents ?? 0), 0);
  const totalGross = (summary.items ?? []).reduce((s: number, i: any) => s + (i.grossProfitCents ?? 0), 0);
  const totalNet = (summary.items ?? []).reduce((s: number, i: any) => s + (i.netProfitCents ?? 0), 0);
  const overhead = summary.overhead ?? {};
  const totalOverhead = (overhead.boothRentalCents ?? 0) + (overhead.travelCents ?? 0) + (overhead.lodgingCents ?? 0);

  const dateStr = eventDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const summaryRows = [
    "",
    `Event,${escapeCsv(eventTitle)}`,
    `Date,${escapeCsv(dateStr)}`,
    `Total Items Brought,${escapeCsv(summary.totalItemsAtEvent ?? 0)}`,
    `Total Overhead,${escapeCsv(centsToUsd(totalOverhead))}`,
    `Total Revenue,${escapeCsv(centsToUsd(totalRevenue))}`,
    `Total Gross Profit,${escapeCsv(centsToUsd(totalGross))}`,
    `Total Net Profit,${escapeCsv(centsToUsd(totalNet))}`,
  ];

  return [header, ...itemRows, ...summaryRows].join("\n");
}

function toDateSlug(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Per-day report for one specific calendar date of a multi-day event.
// Filters sales to that date only. Saves as market-report-{eventId}-{YYYY-MM-DD}.csv.
export async function generateReportsForEventDay(
  eventId: number,
  forDate: Date,
  targetVendorId?: string
): Promise<{ generated: number; skipped: number }> {
  const supabase = getStorageClient();
  if (!supabase) {
    logger.warn("market-report-day: Supabase storage client not configured — skipping");
    return { generated: 0, skipped: 0 };
  }

  const event = await storage.getEvent(eventId);
  if (!event) {
    logger.warn({ eventId }, "market-report-day: event not found");
    return { generated: 0, skipped: 0 };
  }

  const dateSlug = toDateSlug(forDate);
  const vendorIds = targetVendorId
    ? [targetVendorId]
    : await storage.getProVendorsWithAssignmentsAtEvent(eventId);

  let generated = 0;
  let skipped = 0;

  for (const vendorId of vendorIds) {
    try {
      const alreadyExists = await storage.hasExistingDayReport(vendorId, eventId, dateSlug);
      if (alreadyExists) {
        skipped++;
        continue;
      }

      const summary = await storage.getCogsSummaryForEvent(vendorId, eventId, forDate);

      if (!summary.items || summary.items.length === 0) {
        logger.info({ vendorId, eventId, dateSlug }, "market-report-day: no sales for this day — skipping");
        skipped++;
        continue;
      }

      const csv = buildMarketReportCsv(event.title, forDate, summary);
      const csvBuffer = Buffer.from(csv, "utf-8");

      const storagePath = `user-files/${vendorId}/market-report-${eventId}-${dateSlug}.csv`;
      const { error: uploadError } = await supabase.storage
        .from(DOC_BUCKET)
        .upload(storagePath, csvBuffer, { contentType: "text/csv", upsert: true });

      if (uploadError) {
        logger.error({ vendorId, eventId, dateSlug, err: uploadError.message }, "market-report-day: upload failed");
        continue;
      }

      const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(storagePath);

      const dateLabel = forDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const title = `Market Report — ${event.title} — ${dateLabel}`;

      await storage.createUserFile({
        userId: vendorId,
        title,
        fileUrl: urlData.publicUrl,
        fileName: `market-report-${eventId}-${dateSlug}.csv`,
        fileSize: csvBuffer.length,
        fileType: "text/csv",
        storagePath,
      });

      generated++;
      logger.info({ vendorId, eventId, dateSlug }, "market-report-day: report generated successfully");
    } catch (err) {
      logger.error({ vendorId, eventId, dateSlug, err }, "market-report-day: unexpected error for vendor");
    }
  }

  return { generated, skipped };
}

export async function generateReportsForEvent(
  eventId: number,
  targetVendorId?: string
): Promise<{ generated: number; skipped: number }> {
  const supabase = getStorageClient();
  if (!supabase) {
    logger.warn("market-report: Supabase storage client not configured — skipping");
    return { generated: 0, skipped: 0 };
  }

  const event = await storage.getEvent(eventId);
  if (!event) {
    logger.warn({ eventId }, "market-report: event not found");
    return { generated: 0, skipped: 0 };
  }

  const vendorIds = targetVendorId
    ? [targetVendorId]
    : await storage.getProVendorsWithAssignmentsAtEvent(eventId);

  let generated = 0;
  let skipped = 0;

  for (const vendorId of vendorIds) {
    try {
      const alreadyExists = await storage.hasExistingReport(vendorId, eventId);
      if (alreadyExists) {
        skipped++;
        continue;
      }

      const summary = await storage.getCogsSummaryForEvent(vendorId, eventId);

      if (!summary.items || summary.items.length === 0) {
        logger.info({ vendorId, eventId }, "market-report: no inventory items — skipping vendor");
        skipped++;
        continue;
      }

      const csv = buildMarketReportCsv(event.title, new Date(event.date), summary);
      const csvBuffer = Buffer.from(csv, "utf-8");

      const storagePath = `user-files/${vendorId}/market-report-${eventId}.csv`;
      const { error: uploadError } = await supabase.storage
        .from(DOC_BUCKET)
        .upload(storagePath, csvBuffer, { contentType: "text/csv", upsert: true });

      if (uploadError) {
        logger.error({ vendorId, eventId, err: uploadError.message }, "market-report: Supabase upload failed");
        continue;
      }

      const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(storagePath);

      const dateLabel = new Date(event.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const title = `Market Report \u2014 ${event.title} \u2014 ${dateLabel}`;

      await storage.createUserFile({
        userId: vendorId,
        title,
        fileUrl: urlData.publicUrl,
        fileName: `market-report-${eventId}.csv`,
        fileSize: csvBuffer.length,
        fileType: "text/csv",
        storagePath,
      });

      generated++;
      logger.info({ vendorId, eventId }, "market-report: report generated successfully");
    } catch (err) {
      logger.error({ vendorId, eventId, err }, "market-report: unexpected error for vendor");
    }
  }

  return { generated, skipped };
}
