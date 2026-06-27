import { useEffect, useRef, useState } from "react";
import { Mail, Phone, Globe, BookOpen, GraduationCap, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

const CARD_URL = "https://www.useauditready.com";
const LOGO_URL = "/manus-storage/auditready-logo_24c4fb58.png";

// Design tokens matching AuditReady brand
const C = {
  forest: "#1D3D2F",
  forestMid: "#2A5240",
  sage: "#3D6B52",
  amber: "#C4862A",
  amberLight: "#E8A94A",
  parchment: "#F7F3ED",
  cream: "#FDFAF6",
  linen: "#EFE9E0",
  rule: "#E2D9CE",
  inkDark: "#1C1917",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  inkFaint: "#A89880",
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

function downloadVCard() {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Lisset Fernandez",
    "N:Fernandez;Lisset;;;",
    "TITLE:Chief Executive",
    "ORG:AuditReady",
    "EMAIL;TYPE=WORK:vibemogroup@gmail.com",
    "TEL;TYPE=CELL:+19192725208",
    "URL:https://www.useauditready.com",
    "NOTE:Book author. MHA. Oversees AuditReady credentialing compliance software.",
    "END:VCARD",
  ].join("\r\n");

  const blob = new Blob([vcard], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lisset-fernandez-auditready.vcf";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BusinessCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, CARD_URL, {
      width: 160,
      margin: 1,
      color: { dark: C.forest, light: "#FDFAF6" },
    }).then(() => setQrReady(true));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.parchment,
        fontFamily: C.sans,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: C.cream,
          border: `1px solid ${C.rule}`,
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(29,61,47,0.10)",
        }}
      >
        {/* Header band */}
        <div
          style={{
            background: C.forest,
            padding: "32px 28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Logo */}
          <img
            src={LOGO_URL}
            alt="AuditReady"
            style={{
              height: 44,
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              opacity: 0.92,
            }}
          />

          {/* Avatar photo */}
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: `3px solid ${C.amber}`,
              overflow: "hidden",
              marginTop: 4,
              flexShrink: 0,
            }}
          >
            <img
              src="/manus-storage/lisset-headshot_ef1aa5ee.jpeg"
              alt="Lisset Fernandez"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
              }}
            />
          </div>

          {/* Name & title */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: C.serif,
                fontSize: "1.65rem",
                fontWeight: 700,
                color: "#F0EBE3",
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              Lisset Fernandez
            </div>
            <div
              style={{
                fontFamily: C.sans,
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.amberLight,
                marginTop: 6,
              }}
            >
              Chief Executive · AuditReady
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Bio */}
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.88rem",
              color: C.inkMid,
              lineHeight: 1.65,
              margin: "0 0 20px",
            }}
          >
            Book author and healthcare administrator holding a Master of Health Administration (MHA). Lisset oversees{" "}
            <strong style={{ color: C.inkDark }}>AuditReady</strong> — credentialing compliance software built for behavioral health agencies, ABA practices, and mental health clinics.
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: C.rule, marginBottom: 20 }} />

          {/* Credentials badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: C.linen,
                border: `1px solid ${C.rule}`,
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: C.inkMid,
                letterSpacing: "0.04em",
              }}
            >
              <GraduationCap size={12} /> MHA
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: C.linen,
                border: `1px solid ${C.rule}`,
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: C.inkMid,
                letterSpacing: "0.04em",
              }}
            >
              <BookOpen size={12} /> Book Author
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#EBF5EF",
                border: `1px solid #C3DDD0`,
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: C.sage,
                letterSpacing: "0.04em",
              }}
            >
              Compliance Software
            </span>
          </div>

          {/* Contact info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <a
              href="mailto:vibemogroup@gmail.com"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: C.inkDark,
                fontSize: "0.88rem",
                fontWeight: 500,
              }}
            >
              <Mail size={15} color={C.amber} />
              vibemogroup@gmail.com
            </a>
            <a
              href="tel:+19192725208"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: C.inkDark,
                fontSize: "0.88rem",
                fontWeight: 500,
              }}
            >
              <Phone size={15} color={C.amber} />
              (919) 272-5208
            </a>
            <a
              href={CARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: C.inkDark,
                fontSize: "0.88rem",
                fontWeight: 500,
              }}
            >
              <Globe size={15} color={C.amber} />
              www.useauditready.com
            </a>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.rule, marginBottom: 20 }} />

          {/* QR code + save contact row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.inkFaint,
                }}
              >
                Scan to visit
              </div>
              <div
                style={{
                  background: C.cream,
                  border: `1px solid ${C.rule}`,
                  borderRadius: 6,
                  padding: 6,
                  display: "inline-block",
                  opacity: qrReady ? 1 : 0,
                  transition: "opacity 300ms",
                }}
              >
                <canvas ref={canvasRef} style={{ display: "block" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <Button
                onClick={downloadVCard}
                style={{
                  background: C.forest,
                  color: "#F0EBE3",
                  border: "none",
                  fontFamily: C.sans,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  letterSpacing: "0.02em",
                  padding: "10px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Download size={14} />
                Save Contact
              </Button>
              <a
                href={CARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  background: "transparent",
                  border: `1px solid ${C.rule}`,
                  color: C.inkMid,
                  fontFamily: C.sans,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  padding: "9px 16px",
                  borderRadius: 6,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
              >
                <Globe size={14} />
                Visit AuditReady
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.7rem",
          color: C.inkFaint,
          marginTop: 20,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        AuditReady · Credential Compliance Software · North Carolina
      </p>
    </div>
  );
}
