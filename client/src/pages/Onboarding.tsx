import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  Shield,
  Award,
  BookOpen,
  ArrowLeft,
  Info,
  Upload,
  Stethoscope,
  GraduationCap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type CredStatus = "not_started" | "pending_training" | "pending_fieldwork" | "pending_application" | "pending_exam" | "pending_lookup" | "active";
type VerifyMethod = "api" | "portal" | "upload" | "lookup";

interface CredItem {
  id: string;
  name: string;
  category: string;
  required: boolean;
  agencySpecific?: boolean;
  status: CredStatus;
  applyUrl?: string;
  applyLabel?: string;
  verifyMethod: VerifyMethod;
  timeline?: string;
  cost?: string;
  notes?: string;
}

// ─── Role Definitions ─────────────────────────────────────────────────────────
const ROLES = [
  { id: "rbt", label: "RBT", fullName: "Registered Behavior Technician", icon: "🧩", color: "teal" },
  { id: "bcba", label: "BCBA", fullName: "Board Certified Behavior Analyst", icon: "🎓", color: "indigo" },
  { id: "bcaba", label: "BCaBA", fullName: "Board Certified Assistant Behavior Analyst", icon: "📋", color: "violet" },
  { id: "lcmhc", label: "LCMHC / LCMHCA", fullName: "Licensed Clinical Mental Health Counselor", icon: "🧠", color: "blue" },
  { id: "lcsw", label: "LCSW / LCSWA", fullName: "Licensed Certified Social Worker", icon: "🤝", color: "emerald" },
  { id: "psychologist", label: "Psychologist / LPA", fullName: "Licensed Psychologist or Psychological Associate", icon: "🔬", color: "purple" },
  { id: "lmft", label: "LMFT / LMFT-A", fullName: "Licensed Marriage & Family Therapist", icon: "💬", color: "rose" },
];

// ─── Credential Checklists by Role ────────────────────────────────────────────
const ROLE_CREDENTIALS: Record<string, CredItem[]> = {
  rbt: [
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75", notes: "Must be completed before first day of work." },
    { id: "hcpr", name: "NC Health Care Personnel Registry (HCPR) Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free", notes: "Required by 10A NCAC 27G .0104(b)(4). Verifies no abuse/neglect findings." },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free", notes: "Legally required for all Medicaid-billing staff. Must be checked monthly." },
    { id: "rbt_training", name: "40-Hour RBT Training", category: "BACB Certification", required: true, status: "pending_training", verifyMethod: "upload", timeline: "1–4 weeks", cost: "Varies by agency", notes: "Must be completed before applying for RBT certification." },
    { id: "rbt_cert", name: "RBT Certification (BACB)", category: "BACB Certification", required: true, status: "pending_application", applyUrl: "https://www.bacb.com/rbt/", applyLabel: "Apply at BACB", verifyMethod: "portal", timeline: "4–6 weeks after application", cost: "$45 exam fee", notes: "Requires 40-hour training, competency assessment, and passing the Pearson VUE exam." },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload", timeline: "1-day class", cost: "$50–$100", notes: "Required by 10A NCAC 27G .0104(h)." },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload", timeline: "1–2 hours online", cost: "Free (OSHA)", notes: "Required annually per 10A NCAC 27G .0104(g)(4)." },
    { id: "supervision_agreement", name: "Supervision Agreement (BACB)", category: "Supervision", required: true, status: "not_started", applyUrl: "https://www.bacb.com/wp-content/uploads/2020/05/Sample-Supervision-Contract-1.docx", applyLabel: "Download BACB Template", verifyMethod: "upload", notes: "Must be signed before supervised hours begin counting. Annual review required." },
    { id: "tb_screening", name: "TB Screening / Clearance", category: "Health", required: false, agencySpecific: true, status: "not_started", verifyMethod: "upload", cost: "Varies", notes: "Not required by NC Medicaid CCP 8F for outpatient ABA, but required by most private insurers and CARF accreditation." },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload", cost: "$100–$200/year", notes: "Required by some agencies and MCOs. Track Certificate of Insurance expiration date." },
  ],
  bcba: [
    { id: "bcba_cert", name: "BCBA Certification (BACB)", category: "BACB Certification", required: true, status: "not_started", applyUrl: "https://www.bacb.com/bcba/", applyLabel: "Verify / Apply at BACB", verifyMethod: "portal", timeline: "4–8 weeks", cost: "$245 exam fee", notes: "Requires master's degree, BACB coursework, and 2,000 supervised fieldwork hours." },
    { id: "nc_ba_license", name: "NC Behavior Analyst License", category: "State License", required: true, status: "not_started", applyUrl: "https://ncpsychologyboard.info/licensee/applications/", applyLabel: "Apply at NC Psychology Board", verifyMethod: "portal", timeline: "4–6 weeks", notes: "Required for LQASP status and NC Medicaid billing." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: true, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free", notes: "Apply on Day 1. Required before NCTracks enrollment." },
    { id: "nctracks", name: "NCTracks Enrollment", category: "Administrative", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Enroll at NCTracks", verifyMethod: "portal", timeline: "2–4 weeks", cost: "Free", notes: "Required for NC Medicaid billing. Requires active NPI and NC license." },
    { id: "lqasp", name: "LQASP Status (NCTracks)", category: "NC Medicaid Designation", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Update NCTracks Profile", verifyMethod: "portal", notes: "Submit active BACB certification number AND NC Behavior Analyst license to NCTracks. Updated March 2024." },
    { id: "qp_designation", name: "QP Designation (Qualified Professional)", category: "NC Medicaid Designation", required: true, status: "not_started", applyUrl: "https://info.ncdhhs.gov/dhsr/mhlcs/faq.html", applyLabel: "View QP Requirements", verifyMethod: "upload", notes: "BCBAs qualify as QPs by virtue of their license. Verify education + experience meets 10A NCAC 27G .0104 criteria." },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload", timeline: "1-day class", cost: "$50–$100" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload", timeline: "1–2 hours", cost: "Free" },
    { id: "supervision_agreement", name: "BCBA Supervision Agreement (per supervisee)", category: "Supervision", required: true, status: "not_started", applyUrl: "https://www.bacb.com/wp-content/uploads/2020/05/Sample-Supervision-Contract-1.docx", applyLabel: "Download BACB Template", verifyMethod: "upload", notes: "Required for each RBT or BCaBA under supervision. Annual review." },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload", cost: "$300–$700/year" },
    { id: "ceu_hours", name: "CEU Hours (32 per 2-year cycle)", category: "Continuing Education", required: true, status: "not_started", applyUrl: "https://www.bacb.com/", applyLabel: "Track at BACB", verifyMethod: "upload", notes: "32 CEUs required per 2-year renewal cycle. At least 4 must be in ethics." },
  ],
  bcaba: [
    { id: "bcaba_cert", name: "BCaBA Certification (BACB)", category: "BACB Certification", required: true, status: "not_started", applyUrl: "https://www.bacb.com/bcaba/", applyLabel: "Apply at BACB", verifyMethod: "portal", timeline: "4–8 weeks", cost: "$245 exam fee", notes: "Requires bachelor's degree, 225 BACB coursework hours, and 1,000 supervised fieldwork hours." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: false, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free" },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload", timeline: "1-day class", cost: "$50–$100" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload" },
    { id: "supervision_agreement", name: "Supervision Agreement (BACB)", category: "Supervision", required: true, status: "not_started", applyUrl: "https://www.bacb.com/wp-content/uploads/2020/05/Sample-Supervision-Contract-1.docx", applyLabel: "Download BACB Template", verifyMethod: "upload" },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload" },
  ],
  lcmhc: [
    { id: "lcmhca_license", name: "LCMHCA License (Entry Level)", category: "State License", required: true, status: "not_started", applyUrl: "https://portal.ncblcmhc.org/index.aspx", applyLabel: "Apply at NC BLCMHC Portal", verifyMethod: "portal", timeline: "4–6 weeks", cost: "$150 application fee", notes: "LCMHCA is required before LCMHC. New graduates must apply here first." },
    { id: "lcmhc_license", name: "LCMHC License (Full)", category: "State License", required: false, status: "not_started", applyUrl: "https://www.ncblcmhc.org/Licensure/Applying/LCMHC", applyLabel: "Apply for LCMHC", verifyMethod: "portal", timeline: "4–6 weeks", notes: "Requires active LCMHCA + 3,000 supervised post-graduate hours." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: true, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free" },
    { id: "nctracks", name: "NCTracks Enrollment", category: "Administrative", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Enroll at NCTracks", verifyMethod: "portal", timeline: "2–4 weeks", cost: "Free" },
    { id: "qmhp_designation", name: "QMHP Designation (Qualified Mental Health Professional)", category: "NC Medicaid Designation", required: true, status: "not_started", verifyMethod: "upload", notes: "LCMHC/LCMHCA qualifies as QMHP by virtue of license. Verify education + experience meets criteria." },
    { id: "qp_designation", name: "QP Designation (if applicable)", category: "NC Medicaid Designation", required: false, status: "not_started", applyUrl: "https://info.ncdhhs.gov/dhsr/mhlcs/faq.html", applyLabel: "View QP Requirements", verifyMethod: "upload", notes: "Required for some IDD/MH service codes. LCMHC qualifies with license + 4 years experience." },
    { id: "ap_supervision_plan", name: "AP Supervision Plan (if pre-QP)", category: "Supervision", required: false, agencySpecific: true, status: "not_started", verifyMethod: "upload", notes: "Required if staff does not yet meet QP criteria. Must be reviewed annually." },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload" },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload", cost: "$300–$600/year" },
  ],
  lcsw: [
    { id: "lcswa_license", name: "LCSWA License (Entry Level)", category: "State License", required: true, status: "not_started", applyUrl: "https://www.ncswboard.gov/", applyLabel: "Apply at NC SW Board", verifyMethod: "portal", timeline: "21+ days", cost: "$145 application fee", notes: "New MSW graduates apply for LCSWA first. Requires ASWB exam." },
    { id: "lcsw_license", name: "LCSW License (Full)", category: "State License", required: false, status: "not_started", applyUrl: "https://www.ncswboard.gov/certification-licensure-forms/", applyLabel: "Apply for LCSW", verifyMethod: "portal", notes: "Requires active LCSWA + 2 years supervised clinical practice." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: true, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free" },
    { id: "nctracks", name: "NCTracks Enrollment", category: "Administrative", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Enroll at NCTracks", verifyMethod: "portal", timeline: "2–4 weeks", cost: "Free" },
    { id: "qmhp_designation", name: "QMHP Designation", category: "NC Medicaid Designation", required: true, status: "not_started", verifyMethod: "upload" },
    { id: "ap_supervision_plan", name: "AP Supervision Plan (if pre-QP)", category: "Supervision", required: false, agencySpecific: true, status: "not_started", verifyMethod: "upload" },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup", timeline: "Instant", cost: "Free" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload" },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload" },
  ],
  psychologist: [
    { id: "lpa_license", name: "LPA License (Licensed Psychological Associate)", category: "State License", required: false, status: "not_started", applyUrl: "https://ncpsychologyboard.info/licensee/applications/", applyLabel: "Apply at NC Psychology Board", verifyMethod: "portal", cost: "$50 application fee", notes: "For master's-level psychology graduates. Background check required." },
    { id: "psych_license", name: "Licensed Psychologist (Doctoral)", category: "State License", required: false, status: "not_started", applyUrl: "https://ncpsychologyboard.info/licensee/applications/", applyLabel: "Apply at NC Psychology Board", verifyMethod: "portal", notes: "Requires PhD or PsyD from APA-accredited program + 2 years supervised experience + EPPP." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: true, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free" },
    { id: "nctracks", name: "NCTracks Enrollment", category: "Administrative", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Enroll at NCTracks", verifyMethod: "portal" },
    { id: "qp_designation", name: "QP Designation", category: "NC Medicaid Designation", required: true, status: "not_started", verifyMethod: "upload" },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload", timeline: "1–5 business days", cost: "$30–$75" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload" },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload" },
  ],
  lmft: [
    { id: "lmfta_license", name: "LMFT-A License (Entry Level)", category: "State License", required: true, status: "not_started", applyUrl: "https://www.ncbmft.org/licensure/license-application", applyLabel: "Apply at NC BMFT", verifyMethod: "portal", notes: "For new MFT graduates. Requires master's degree + MFT national exam." },
    { id: "lmft_license", name: "LMFT License (Full)", category: "State License", required: false, status: "not_started", applyUrl: "https://www.ncbmft.org/licensure/license-application", applyLabel: "Apply for LMFT", verifyMethod: "portal", notes: "Requires active LMFT-A + 1,500 supervised clinical hours (200 direct supervision)." },
    { id: "npi", name: "NPI Number (NPPES)", category: "Administrative", required: true, status: "not_started", applyUrl: "https://nppes.cms.hhs.gov/", applyLabel: "Apply at NPPES (Free)", verifyMethod: "api", timeline: "1–2 business days", cost: "Free" },
    { id: "nctracks", name: "NCTracks Enrollment", category: "Administrative", required: true, status: "not_started", applyUrl: "https://www.nctracks.nc.gov/", applyLabel: "Enroll at NCTracks", verifyMethod: "portal" },
    { id: "qmhp_designation", name: "QMHP Designation", category: "NC Medicaid Designation", required: true, status: "not_started", verifyMethod: "upload" },
    { id: "bg_check", name: "Background Check", category: "Compliance", required: true, status: "not_started", verifyMethod: "upload" },
    { id: "hcpr", name: "NC HCPR Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://ncnar.ncdhhs.gov/verify_listings1.jsp", applyLabel: "Run HCPR Lookup", verifyMethod: "lookup" },
    { id: "oig", name: "OIG Exclusion Check", category: "Compliance", required: true, status: "pending_lookup", applyUrl: "https://oig.hhs.gov/exclusions/exclusions_list.asp", applyLabel: "Run OIG Lookup", verifyMethod: "lookup" },
    { id: "cpr", name: "CPR / First Aid Certification", category: "Safety", required: true, status: "not_started", applyUrl: "https://cpr.heart.org/en/cpr-courses-and-kits/find-a-course", applyLabel: "Find AHA Class", verifyMethod: "upload" },
    { id: "bbp", name: "Bloodborne Pathogens Training", category: "Safety", required: true, status: "not_started", applyUrl: "https://www.osha.gov/bloodborne-pathogens", applyLabel: "Free OSHA Training", verifyMethod: "upload" },
    { id: "liability_insurance", name: "Individual Liability Insurance (COI)", category: "Insurance", required: false, agencySpecific: true, status: "not_started", applyUrl: "https://www.cmfgroup.com/", applyLabel: "Get Coverage at CM&F", verifyMethod: "upload" },
  ],
};

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<CredStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:               { label: "Active",               color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
  pending_application:  { label: "Application Submitted", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",     icon: <Clock className="w-4 h-4 text-amber-600" /> },
  pending_training:     { label: "In Training",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",       icon: <BookOpen className="w-4 h-4 text-blue-600" /> },
  pending_fieldwork:    { label: "Fieldwork Hours",       color: "text-violet-700", bg: "bg-violet-50 border-violet-200",   icon: <Clock className="w-4 h-4 text-violet-600" /> },
  pending_exam:         { label: "Awaiting Exam",         color: "text-orange-700", bg: "bg-orange-50 border-orange-200",   icon: <GraduationCap className="w-4 h-4 text-orange-600" /> },
  pending_lookup:       { label: "Lookup Required",       color: "text-rose-700",   bg: "bg-rose-50 border-rose-200",       icon: <AlertCircle className="w-4 h-4 text-rose-600" /> },
  not_started:          { label: "Not Started",           color: "text-slate-500",  bg: "bg-slate-50 border-slate-200",     icon: <AlertCircle className="w-4 h-4 text-slate-400" /> },
};

const VERIFY_METHOD_LABELS: Record<VerifyMethod, { label: string; color: string }> = {
  api:    { label: "Auto-Verify (API)", color: "text-teal-700 bg-teal-50" },
  portal: { label: "Portal Lookup",    color: "text-indigo-700 bg-indigo-50" },
  lookup: { label: "Instant Lookup",   color: "text-blue-700 bg-blue-50" },
  upload: { label: "Document Upload",  color: "text-slate-600 bg-slate-100" },
};

// ─── Category Icons ────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "BACB Certification":       <Award className="w-4 h-4" />,
  "State License":            <Shield className="w-4 h-4" />,
  "NC Medicaid Designation":  <Stethoscope className="w-4 h-4" />,
  "Administrative":           <FileText className="w-4 h-4" />,
  "Compliance":               <CheckCircle2 className="w-4 h-4" />,
  "Safety":                   <Shield className="w-4 h-4" />,
  "Supervision":              <User className="w-4 h-4" />,
  "Insurance":                <FileText className="w-4 h-4" />,
  "Health":                   <Stethoscope className="w-4 h-4" />,
  "Continuing Education":     <BookOpen className="w-4 h-4" />,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [credStatuses, setCredStatuses] = useState<Record<string, CredStatus>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const role = ROLES.find(r => r.id === selectedRole);
  const credentials = selectedRole ? ROLE_CREDENTIALS[selectedRole] || [] : [];

  // Group credentials by category
  const grouped = credentials.reduce<Record<string, CredItem[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const getStatus = (cred: CredItem): CredStatus => credStatuses[cred.id] ?? cred.status;

  const completedCount = credentials.filter(c => getStatus(c) === "active").length;
  const totalRequired = credentials.filter(c => c.required).length;
  const completedRequired = credentials.filter(c => c.required && getStatus(c) === "active").length;
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const toggleCategory = (cat: string) =>
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const toggleNotes = (id: string) =>
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));

  const cycleStatus = (cred: CredItem) => {
    const cycle: CredStatus[] = ["not_started", "pending_training", "pending_application", "active"];
    const current = getStatus(cred);
    const idx = cycle.indexOf(current);
    const next = cycle[(idx + 1) % cycle.length];
    setCredStatuses(prev => ({ ...prev, [cred.id]: next }));
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8F7F4]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <a className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </a>
            </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', serif" }}>New Hire Onboarding</h1>
                <p className="text-sm text-slate-500">Role-based credential checklists with direct application links</p>
              </div>
            </div>
            {selectedRole && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Required credentials complete</p>
                  <p className="text-lg font-bold text-teal-700">{completedRequired}/{totalRequired}</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-teal-200 flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#0d9488" strokeWidth="4" strokeDasharray={`${progress * 1.257} 125.7`} strokeLinecap="round" />
                  </svg>
                  <span className="text-xs font-bold text-teal-700 relative z-10">{progress}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 max-w-5xl mx-auto">

            {/* Info Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 flex gap-3">
              <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-800">
                <strong>For new professionals who don't yet have their credentials:</strong> Select a role below to see the complete checklist of credentials they need to obtain, with official application links, timelines, and costs. This checklist is based on NC Medicaid CCP 8F, 10A NCAC 27G, and BACB requirements.
              </div>
            </div>

            {/* Role Selector */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Select Staff Role</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRole(r.id); setCredStatuses({}); setExpandedCategories({}); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedRole === r.id
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="text-2xl mb-2">{r.icon}</div>
                    <div className="font-bold text-slate-800 text-sm">{r.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-tight">{r.fullName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Credential Checklist */}
            {selectedRole && role && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {role.icon} {role.fullName} — Credential Checklist
                  </h2>
                  <span className="text-sm text-slate-500">{credentials.length} credentials tracked</span>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Onboarding Progress</span>
                    <span className="text-sm font-bold text-teal-700">{completedRequired} of {totalRequired} required credentials active</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active: {credentials.filter(c => getStatus(c) === "active").length}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending: {credentials.filter(c => ["pending_application","pending_training","pending_fieldwork","pending_exam","pending_lookup"].includes(getStatus(c))).length}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Not Started: {credentials.filter(c => getStatus(c) === "not_started").length}</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, items]) => {
                    const isExpanded = expandedCategories[category] !== false; // default expanded
                    const catComplete = items.filter(c => getStatus(c) === "active").length;
                    return (
                      <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-slate-500">{CATEGORY_ICONS[category] || <FileText className="w-4 h-4" />}</span>
                            <span className="font-semibold text-slate-800 text-sm">{category}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{catComplete}/{items.length}</span>
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-slate-100">
                            {items.map(cred => {
                              const status = getStatus(cred);
                              const sc = STATUS_CONFIG[status];
                              const vm = VERIFY_METHOD_LABELS[cred.verifyMethod];
                              const notesOpen = expandedNotes[cred.id];
                              return (
                                <div key={cred.id} className="px-5 py-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-slate-800 text-sm">{cred.name}</span>
                                        {cred.required && (
                                          <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Required</span>
                                        )}
                                        {cred.agencySpecific && (
                                          <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-full font-medium">Agency Policy</span>
                                        )}
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${vm.color}`}>{vm.label}</span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        {cred.timeline && <span className="text-xs text-slate-500">⏱ {cred.timeline}</span>}
                                        {cred.cost && <span className="text-xs text-slate-500">💰 {cred.cost}</span>}
                                        {cred.notes && (
                                          <button onClick={() => toggleNotes(cred.id)} className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
                                            <Info className="w-3 h-3" /> {notesOpen ? "Hide note" : "View note"}
                                          </button>
                                        )}
                                      </div>
                                      {notesOpen && cred.notes && (
                                        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                          {cred.notes}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {/* Status Badge — click to cycle */}
                                      <button
                                        onClick={() => cycleStatus(cred)}
                                        title="Click to update status"
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80 ${sc.bg} ${sc.color}`}
                                      >
                                        {sc.icon}
                                        {sc.label}
                                      </button>
                                      {/* Apply / Verify Link */}
                                      {cred.applyUrl && (
                                        <a
                                          href={cred.applyUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                          {cred.verifyMethod === "upload" ? <Upload className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                                          {cred.applyLabel || "Apply"}
                                        </a>
                                      )}
                                      {!cred.applyUrl && cred.verifyMethod === "upload" && (
                                        <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors">
                                          <Upload className="w-3 h-3" /> Upload Doc
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer note */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Disclaimer:</strong> This checklist is based on NC Medicaid CCP 8F, 10A NCAC 27G, and BACB requirements as of May 2026. Requirements may change. Always verify current requirements with the relevant licensing board before making hiring decisions. AuditReady does not provide legal or compliance advice.
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!selectedRole && (
              <div className="text-center py-20 text-slate-400">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-slate-500">Select a role above to view the onboarding checklist</p>
                <p className="text-sm mt-1">Each role shows the exact credentials required, with direct links to apply</p>
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
