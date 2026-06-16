interface EmailTemplateParams {
  title: string;
  body: string;
  otp?: string;
  cta?: { label: string; url: string };
  warning?: string;
}

const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
<rect x="2" y="2" width="28" height="28" rx="0" stroke="#000" stroke-width="2" fill="none" style="border-radius:8px 0 8px 0"/>
<line x1="10" y1="16" x2="22" y2="16" stroke="#000" stroke-width="2"/>
<line x1="16" y1="10" x2="16" y2="22" stroke="#000" stroke-width="2"/>
<circle cx="16" cy="16" r="3" fill="#000" stroke="none"/>
</svg>`;

export function emailTemplate(p: EmailTemplateParams): string {
  const otpBlock = p.otp
    ? `<div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:12px 0 12px 0;padding:24px 16px;text-align:center;margin:24px 0;letter-spacing:8px;font-size:36px;font-weight:700;color:#000;font-family:'Courier New',Courier,monospace;word-break:break-all">${p.otp}</div>`
    : '';

  const ctaBlock = p.cta
    ? `<a href="${p.cta.url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px 0 12px 0;font-size:14px;font-weight:600;margin:16px 0;letter-spacing:0.3px">${p.cta.label}</a>`
    : '';

  const warningBlock = p.warning
    ? `<p style="font-size:12px;color:#999;margin:20px 0 0;line-height:1.5">${p.warning}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
<style>
@media only screen and (max-width:560px){
  .email-card{padding:24px 20px !important}
  .email-header td{display:block !important;text-align:center !important;padding:4px 0}
  .email-otp{font-size:28px !important;letter-spacing:6px !important;padding:16px 12px !important}
  .email-footer td{display:block !important;text-align:center !important}
}
@media only screen and (max-width:380px){
  .email-card{padding:16px !important}
  .email-otp{font-size:22px !important;letter-spacing:4px !important}
  .email-cta{display:block !important;text-align:center !important;padding:12px 20px !important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:100%">

<!-- Header -->
<tr><td style="padding-bottom:20px">
<table class="email-header" role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-size:20px;font-weight:800;color:#000;letter-spacing:1.5px;text-transform:uppercase;vertical-align:middle">
${LOGO_SVG}
<span style="vertical-align:middle;margin-left:8px">FRESTELL</span>
</td>
<td style="text-align:right;font-size:10px;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;vertical-align:middle">Trustless Freelance</td>
</tr>
</table>
</td></tr>

<!-- Card -->
<tr><td class="email-card" style="background:#fff;border:1px solid #e0e0e0;border-radius:12px 0 12px 0;padding:32px 36px">
<h1 style="font-size:18px;font-weight:700;color:#000;margin:0 0 6px;letter-spacing:-0.3px">${p.title}</h1>
<div style="font-size:14px;line-height:1.7;color:#444">
${p.body}
${otpBlock}
${ctaBlock}
${warningBlock}
</div>
</td></tr>

<!-- Footer -->
<tr><td class="email-footer" style="padding:20px 0 0;text-align:center">
<p style="font-size:11px;color:#aaa;margin:0 0 4px">FreStell &mdash; Trustless Freelance Platform</p>
<p style="font-size:11px;color:#bbb;margin:0">If you didn&rsquo;t request this, you can safely ignore this email.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
