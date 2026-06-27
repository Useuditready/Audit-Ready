// Quick SAM.gov API test — run with: node test-sam.mjs
// Tests the actual API response parsing with the real key

const KEY = "SAM-00402343-6895-443b-a0c7-1187a86e33b1";

async function testSAMgov(firstName, lastName) {
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const params = new URLSearchParams({
    api_key: KEY,
    legalBusinessName: fullName,
    size: "5",
  });

  const res = await fetch(
    `https://api.sam.gov/entity-information/v4/exclusions?${params.toString()}`,
    {
      headers: { "User-Agent": "AuditReady/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    }
  );

  console.log("HTTP Status:", res.status);
  if (!res.ok) {
    const text = await res.text();
    console.log("Error body:", text);
    return;
  }

  const data = await res.json();
  console.log("totalRecords:", data.totalRecords);
  console.log("excludedEntity count:", data.excludedEntity?.length ?? 0);

  const rawRecords = data.excludedEntity ?? [];
  const now = new Date();
  const activeRecords = rawRecords.filter((r) => {
    const actions = r.exclusionActions?.listOfActions ?? [];
    return actions.some((a) => {
      if (a.recordStatus !== "Active") return false;
      const termDate = a.terminationDate;
      if (!termDate) return true;
      const parts = termDate.split("-");
      if (parts.length !== 3) return true;
      const [mm, dd, yyyy] = parts;
      const term = new Date(`${yyyy}-${mm}-${dd}`);
      return term > now;
    });
  });

  console.log("Active exclusion matches:", activeRecords.length);

  if (activeRecords.length > 0) {
    const r = activeRecords[0];
    console.log("First match:", {
      entityName: r.exclusionIdentification?.entityName,
      firstName: r.exclusionIdentification?.firstName,
      lastName: r.exclusionIdentification?.lastName,
      exclusionType: r.exclusionDetails?.exclusionType,
      excludingAgency: r.exclusionDetails?.excludingAgencyName,
      activateDate: r.exclusionActions?.listOfActions?.[0]?.activateDate,
      terminationDate: r.exclusionActions?.listOfActions?.[0]?.terminationDate,
      recordStatus: r.exclusionActions?.listOfActions?.[0]?.recordStatus,
      city: r.exclusionPrimaryAddress?.city,
      state: r.exclusionPrimaryAddress?.stateOrProvinceCode,
    });
  }
}

console.log("=== Testing: John Smith ===");
await testSAMgov("John", "Smith");
console.log("\n=== Testing: Jane Doe (expect no exclusions) ===");
await testSAMgov("Jane", "Doe");
