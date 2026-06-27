/**
 * AuditReady — National Verification Service
 *
 * Queries four sources:
 *   1. BACB      — Behavior Analyst Certification Board (BCBA, BCaBA, RBT)
 *                  NOTE: BACB does not provide a public API. Verification must be
 *                  done manually at https://www.bacb.com/services/o.php?page=101135
 *                  This service returns manual_review_required with a direct link.
 *   2. OIG LEIE  — Office of Inspector General exclusion list (all staff)
 *   3. NPI       — CMS National Plan & Provider Enumeration System (licensed providers)
 *   4. SAM.gov   — System for Award Management federal exclusions/debarment database
 *                  Requires SAM_GOV_API_KEY env var (free, register at sam.gov).
 *                  Returns api_key_required status when key is not configured.
 *
 * IMPORTANT DISCLAIMER:
 * Results are for administrative support only. AuditReady does not guarantee
 * compliance, licensure, payer eligibility, Medicaid eligibility, or employment
 * eligibility. Agencies remain responsible for confirming requirements with the
 * appropriate board, payer, employer policy, or authority.
 *
 * No PHI, patient data, or clinical information is stored or transmitted.
 */
export type VerificationSource = "bacb" | "oig_leie" | "npi" | "sam_gov";
export type VerificationStatus =
  | "not_checked"
  | "verified"
  | "needs_review"
  | "not_found"
  | "manual_review_required";
export interface SourceResult {
  source: VerificationSource;
  found: boolean;
  matchCount: number;
  records: Record<string, unknown>[];
  queriedAt: string;
  error?: string;
  /** Suggested status before admin review — never auto-sets "verified" */
  suggestedStatus: Exclude<VerificationStatus, "verified">;
  /** Direct link for manual verification (BACB only) */
  manualVerifyUrl?: string;
  /** Human-readable instruction for manual verification */
  manualVerifyNote?: string;
  /** True when the check requires an API key that has not been configured */
  apiKeyRequired?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BACB — Behavior Analyst Certification Board
//    Manual verification only: https://www.bacb.com/services/o.php?page=101135
//    BACB does not provide a public API. The registry must be checked manually.
// ─────────────────────────────────────────────────────────────────────────────
export async function checkBACB(
  firstName: string,
  lastName: string,
  certNumber?: string
): Promise<SourceResult> {
  const queriedAt = new Date().toISOString();

  // Build a pre-filled search URL for the BACB registry
  const registryParams = new URLSearchParams();
  registryParams.set("firstName", firstName.trim());
  registryParams.set("lastName", lastName.trim());
  if (certNumber) registryParams.set("certNumber", certNumber.trim());

  // BACB Certificant Registry — the official lookup page (does not support query params for pre-fill)
  const manualVerifyUrl = `https://www.bacb.com/services/o.php?page=101135`;

  return {
    source: "bacb",
    found: false,
    matchCount: 0,
    records: [],
    queriedAt,
    suggestedStatus: "manual_review_required",
    manualVerifyUrl,
    manualVerifyNote:
      `BACB does not offer a public API, so this check must be done manually. ` +
      `Follow these steps:\n` +
      `1. Click "Open BACB Registry" below — it opens the official BACB Certificant Registry.\n` +
      `2. In the search box, type the staff member's name: ${firstName.trim()} ${lastName.trim()}${certNumber ? ` or certification number: ${certNumber.trim()}` : ""}.\n` +
      `3. Confirm their certification is Active and not expired.\n` +
      `4. Return here and click Approve (if active) or Flag (if expired or not found).\n` +
      `This takes about 30 seconds and the result is permanently logged to the audit trail.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OIG LEIE — Office of Inspector General Exclusion List
//    Source: https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv
//    The OIG LEIE website blocks server-side API calls (ASP.NET session-gated).
//    The correct approach is to download the official monthly CSV database
//    (~15MB) and search it in-memory. OIG updates this file monthly.
//    CSV columns: LASTNAME,FIRSTNAME,MIDNAME,BUSNAME,GENERAL,SPECIALTY,
//                 UPIN,NPI,DOB,ADDRESS,CITY,STATE,ZIP,EXCLTYPE,EXCLDATE,
//                 REINDATE,WAIVERDATE,WVRSTATE
// ─────────────────────────────────────────────────────────────────────────────

const OIG_CSV_URL = "https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv";

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function checkOIGLEIE(
  firstName: string,
  lastName: string
): Promise<SourceResult> {
  const queriedAt = new Date().toISOString();
  try {
    // Download the full LEIE CSV database from OIG
    const res = await fetch(OIG_CSV_URL, {
      method: "GET",
      headers: { "User-Agent": "AuditReady/1.0 (admin-credential-verification)" },
      signal: AbortSignal.timeout(30_000), // 15MB file — allow 30s
    });
    if (!res.ok) {
      return {
        source: "oig_leie",
        found: false,
        matchCount: 0,
        records: [],
        queriedAt,
        error: `OIG LEIE CSV download failed: HTTP ${res.status}`,
        suggestedStatus: "manual_review_required",
        manualVerifyUrl: `https://exclusions.oig.hhs.gov/`,
        manualVerifyNote: "OIG LEIE CSV download failed. Please verify manually at exclusions.oig.hhs.gov.",
      };
    }

    const csvText = await res.text();
    const lines = csvText.split("\n");
    if (lines.length < 2) throw new Error("OIG LEIE CSV appears empty");

    // Parse header row
    const headers = parseCsvLine(lines[0]).map(h => h.toUpperCase());
    const lastNameIdx = headers.indexOf("LASTNAME");
    const firstNameIdx = headers.indexOf("FIRSTNAME");
    const exclTypeIdx = headers.indexOf("EXCLTYPE");
    const exclDateIdx = headers.indexOf("EXCLDATE");
    const reinDateIdx = headers.indexOf("REINDATE");
    const stateIdx = headers.indexOf("STATE");
    const npiIdx = headers.indexOf("NPI");

    const searchLast = lastName.trim().toUpperCase();
    const searchFirst = firstName.trim().toUpperCase();

    const matches: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = parseCsvLine(line);
      const rowLast = (fields[lastNameIdx] ?? "").toUpperCase();
      const rowFirst = (fields[firstNameIdx] ?? "").toUpperCase();
      // Exact last name match + first name starts-with (handles nicknames/initials)
      if (rowLast === searchLast && rowFirst.startsWith(searchFirst)) {
        const reinDate = fields[reinDateIdx] ?? "";
        // Skip reinstated individuals (reinDate != "00000000")
        if (reinDate && reinDate !== "00000000") continue;
        matches.push({
          lastName: fields[lastNameIdx],
          firstName: fields[firstNameIdx],
          exclusionType: fields[exclTypeIdx],
          exclusionDate: fields[exclDateIdx],
          reinstatementDate: reinDate,
          state: fields[stateIdx],
          npi: fields[npiIdx],
        });
      }
    }

    return {
      source: "oig_leie",
      found: matches.length > 0,
      matchCount: matches.length,
      records: matches,
      queriedAt,
      // Any active exclusion match is a serious flag — always requires human review
      suggestedStatus: matches.length > 0 ? "needs_review" : "not_found",
      ...(matches.length > 0 ? {
        manualVerifyUrl: `https://exclusions.oig.hhs.gov/`,
        manualVerifyNote: `${matches.length} potential exclusion match(es) found. Please verify manually at exclusions.oig.hhs.gov before proceeding.`,
      } : {}),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: "oig_leie",
      found: false,
      matchCount: 0,
      records: [],
      queriedAt,
      error: message,
      suggestedStatus: "manual_review_required",
      manualVerifyUrl: "https://exclusions.oig.hhs.gov/",
      manualVerifyNote: "OIG LEIE check failed. Please verify manually at exclusions.oig.hhs.gov.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NPI Registry — CMS National Plan & Provider Enumeration System
//    API: https://npiregistry.cms.hhs.gov/api/?version=2.1
//    Covers: Licensed providers with NPI numbers
// ─────────────────────────────────────────────────────────────────────────────
export async function checkNPI(
  firstName: string,
  lastName: string,
  npiNumber?: string,
  state?: string
): Promise<SourceResult> {
  const queriedAt = new Date().toISOString();
  try {
    // If NPI number is provided, search by NPI directly — returns exactly 1 result
    let params: URLSearchParams;
    if (npiNumber?.trim()) {
      params = new URLSearchParams({
        version: "2.1",
        number: npiNumber.trim(),
      });
    } else {
      const nameParams: Record<string, string> = {
        version: "2.1",
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        limit: "20",
      };
      // If a state is provided, add it to narrow results to that state only
      if (state?.trim()) {
        nameParams.state = state.trim().toUpperCase();
      }
      params = new URLSearchParams(nameParams);
    }
    const res = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "User-Agent": "AuditReady/1.0 (admin-credential-verification)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) {
      return {
        source: "npi",
        found: false,
        matchCount: 0,
        records: [],
        queriedAt,
        error: `NPI Registry returned HTTP ${res.status}`,
        suggestedStatus: "manual_review_required",
      };
    }
    const data = (await res.json()) as {
      result_count?: number;
      results?: Record<string, unknown>[];
    };
    const allRecords = data.results ?? [];

    // Filter results: keep only records where the first name starts with the
    // search first name (case-insensitive). This removes false positives like
    // "Patricia" when searching for "Patrice".
    const searchFirstNorm = firstName.trim().toLowerCase();
    const filteredRecords = allRecords.filter((r: Record<string, unknown>) => {
      const basic = r.basic as Record<string, unknown> | undefined;
      if (!basic) return false;
      const recFirst = ((basic.first_name as string) ?? "").toLowerCase();
      const recFirstAlt = ((basic.authorized_official_first_name as string) ?? "").toLowerCase();
      return recFirst.startsWith(searchFirstNorm) || recFirstAlt.startsWith(searchFirstNorm);
    });

    const records = filteredRecords;
    const total = records.length;
    return {
      source: "npi",
      found: total > 0,
      matchCount: total,
      records,
      queriedAt,
      suggestedStatus: total > 0 ? "needs_review" : "not_found",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: "npi",
      found: false,
      matchCount: 0,
      records: [],
      queriedAt,
      error: message,
      suggestedStatus: "manual_review_required",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SAM.gov — System for Award Management
//    API: https://api.sam.gov/entity-information/v4/exclusions
//    Covers: Federal exclusions, debarments, and suspensions for individuals and firms
//    Requires: SAM_GOV_API_KEY env var (free personal key from sam.gov → Account Details)
//    Returns api_key_required status when key is not configured.
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSAMgov(
  firstName: string,
  lastName: string,
  apiKey?: string
): Promise<SourceResult> {
  const queriedAt = new Date().toISOString();
  const key = apiKey ?? process.env.SAM_GOV_API_KEY ?? "";

  // If no API key is configured, return a clear instructional result
  if (!key) {
    return {
      source: "sam_gov",
      found: false,
      matchCount: 0,
      records: [],
      queriedAt,
      suggestedStatus: "manual_review_required",
      apiKeyRequired: true,
      manualVerifyUrl: "https://sam.gov/content/exclusions",
      manualVerifyNote:
        "SAM.gov API key not configured. To enable live SAM.gov checks: " +
        "(1) Create a free account at sam.gov, " +
        "(2) Go to Account Details → Generate Personal API Key, " +
        "(3) Add it as SAM_GOV_API_KEY in your app secrets. " +
        "You can also search manually at sam.gov/content/exclusions.",
    };
  }

  try {
    // SAM.gov Exclusions API v4 — search by individual name.
    // Per official docs (open.gsa.gov/api/exclusions-api/), 'exclusionName' is the
    // correct parameter for searching individuals. 'legalBusinessName' is for firms.
    // Adding classification=Individual to narrow results to people only.
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const params = new URLSearchParams({
      api_key: key,
      exclusionName: fullName,
      classification: "Individual",
      size: "10",
    });

    const res = await fetch(
      `https://api.sam.gov/entity-information/v4/exclusions?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "User-Agent": "AuditReady/1.0 (admin-credential-verification)",
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (res.status === 401 || res.status === 403) {
      return {
        source: "sam_gov",
        found: false,
        matchCount: 0,
        records: [],
        queriedAt,
        error: `SAM.gov API key invalid or unauthorized (HTTP ${res.status})`,
        suggestedStatus: "manual_review_required",
        apiKeyRequired: true,
        manualVerifyUrl: "https://sam.gov/content/exclusions",
        manualVerifyNote: "SAM.gov API key is invalid. Please verify the key in your app secrets and regenerate if needed at sam.gov → Account Details.",
      };
    }

    if (!res.ok) {
      return {
        source: "sam_gov",
        found: false,
        matchCount: 0,
        records: [],
        queriedAt,
        error: `SAM.gov API returned HTTP ${res.status}`,
        suggestedStatus: "manual_review_required",
        manualVerifyUrl: "https://sam.gov/content/exclusions",
        manualVerifyNote: "SAM.gov check failed. Please verify manually at sam.gov/content/exclusions.",
      };
    }

    const data = (await res.json()) as {
      totalRecords?: number;
      excludedEntity?: Array<{
        exclusionDetails?: Record<string, unknown>;
        exclusionIdentification?: Record<string, unknown>;
        exclusionActions?: { listOfActions?: Array<Record<string, unknown>> };
        exclusionPrimaryAddress?: Record<string, unknown>;
      }>;
    };

    const rawRecords = data.excludedEntity ?? [];
    // Filter to only active exclusions where terminationDate is in the future
    const now = new Date();
    const activeRecords = rawRecords.filter((r) => {
      const actions = r.exclusionActions?.listOfActions ?? [];
      return actions.some((a) => {
        if (a["recordStatus"] !== "Active") return false;
        const termDate = a["terminationDate"] as string | null;
        if (!termDate) return true;
        // terminationDate format: MM-DD-YYYY
        const parts = termDate.split("-");
        if (parts.length !== 3) return true;
        const [mm, dd, yyyy] = parts;
        const term = new Date(`${yyyy}-${mm}-${dd}`);
        return term > now;
      });
    });

    // Map to clean display records
    const records = activeRecords.map((r) => ({
      entityName: r.exclusionIdentification?.["entityName"],
      firstName: r.exclusionIdentification?.["firstName"],
      lastName: r.exclusionIdentification?.["lastName"],
      classificationType: r.exclusionDetails?.["classificationType"],
      exclusionType: r.exclusionDetails?.["exclusionType"],
      exclusionProgram: r.exclusionDetails?.["exclusionProgram"],
      excludingAgencyName: r.exclusionDetails?.["excludingAgencyName"],
      activateDate: (r.exclusionActions?.listOfActions?.[0])?.["activateDate"],
      terminationDate: (r.exclusionActions?.listOfActions?.[0])?.["terminationDate"],
      recordStatus: (r.exclusionActions?.listOfActions?.[0])?.["recordStatus"],
      city: r.exclusionPrimaryAddress?.["city"],
      state: r.exclusionPrimaryAddress?.["stateOrProvinceCode"],
    }));
    const total = records.length;

    return {
      source: "sam_gov",
      found: total > 0,
      matchCount: total,
      records,
      queriedAt,
      // Any active SAM exclusion is a serious flag — always requires human review
      suggestedStatus: total > 0 ? "needs_review" : "not_found",
      ...(total > 0
        ? {
            manualVerifyUrl: `https://sam.gov/content/exclusions`,
            manualVerifyNote: `${total} potential SAM.gov exclusion match(es) found. Please verify manually at sam.gov/content/exclusions before proceeding.`,
          }
        : {}),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: "sam_gov",
      found: false,
      matchCount: 0,
      records: [],
      queriedAt,
      error: message,
      suggestedStatus: "manual_review_required",
      manualVerifyUrl: "https://sam.gov/content/exclusions",
      manualVerifyNote: "SAM.gov check failed. Please verify manually at sam.gov/content/exclusions.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — run all requested checks
// ─────────────────────────────────────────────────────────────────────────────
export async function runVerificationChecks(
  firstName: string,
  lastName: string,
  sources: VerificationSource[],
  certNumber?: string,
  npiNumber?: string,
  state?: string
): Promise<SourceResult[]> {
  const results: SourceResult[] = [];

  for (const source of sources) {
    if (source === "bacb") {
      results.push(await checkBACB(firstName, lastName, certNumber));
    } else if (source === "oig_leie") {
      results.push(await checkOIGLEIE(firstName, lastName));
    } else if (source === "npi") {
      results.push(await checkNPI(firstName, lastName, npiNumber, state));
    } else if (source === "sam_gov") {
      results.push(await checkSAMgov(firstName, lastName));
    }
  }

  return results;
}
