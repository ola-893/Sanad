import { MarketingHero } from "@/components/marketing-hero"
import { SectionTag } from "@/components/section-heading"

function ProseHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-[#171414]">
      {children}
    </h2>
  )
}

function ProseSubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-display text-xl font-bold text-[#171414]">{children}</h3>
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="my-4 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm text-[#4A4A4A]">
          <span className="mt-1.5 h-1 w-3 shrink-0 bg-[#E1BAC2]" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero
          kicker="Security"
          title="Security"
          description="How we protect your information and transactions — encryption, audit trails, and access controls."
        />

        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 md:px-6">
            <div className="space-y-10">
              <p className="text-muted-foreground">
                At Sanad, the security of your information and transactions is our highest priority. We employ
                advanced security measures and follow industry best practices to ensure that your data and financial
                transactions are protected at all times.
              </p>

              <ProseHeading>Data Protection Measures</ProseHeading>

              <ProseSubHeading>Encryption</ProseSubHeading>
              <p className="text-[#4A4A4A]">We use industry-standard encryption technologies to protect your data:</p>
              <BulletList
                items={[
                  "256-bit SSL/TLS encryption for all data in transit",
                  "AES-256 encryption for sensitive data at rest",
                  "End-to-end encryption for secure communications",
                ]}
              />

              <ProseSubHeading>Secure Infrastructure</ProseSubHeading>
              <p className="text-[#4A4A4A]">Our platform is built on a secure infrastructure that includes:</p>
              <BulletList
                items={[
                  "Cloud services with ISO 27001, SOC 1, SOC 2, and PCI DSS compliance",
                  "Regular security patching and updates",
                  "Network segregation and firewalls",
                  "Intrusion detection and prevention systems",
                  "24/7 monitoring for suspicious activities",
                ]}
              />

              <ProseHeading>Transaction Security</ProseHeading>

              <ProseSubHeading>Secure Payment Processing</ProseSubHeading>
              <p className="text-[#4A4A4A]">
                All financial transactions on our platform are processed through secure payment gateways that adhere to the
                highest security standards:
              </p>
              <BulletList
                items={[
                  "PCI DSS compliant payment processing",
                  "Tokenization of payment information",
                  "Multi-factor authentication for high-value transactions",
                  "Real-time fraud detection systems",
                ]}
              />

              <ProseSubHeading>Transaction Verification</ProseSubHeading>
              <p className="text-[#4A4A4A]">We implement multiple layers of verification for all transactions:</p>
              <BulletList
                items={[
                  "Identity verification before transaction approval",
                  "Transaction confirmation via secure channels",
                  "Anomaly detection to identify unusual transaction patterns",
                  "Transaction limits and controls",
                ]}
              />

              <ProseHeading>Account Security</ProseHeading>

              <ProseSubHeading>Authentication</ProseSubHeading>
              <p className="text-[#4A4A4A]">We implement robust authentication mechanisms to protect your account:</p>
              <BulletList
                items={[
                  "Strong password requirements",
                  "Multi-factor authentication (MFA)",
                  "Biometric authentication options (for supported devices)",
                  "Automatic session timeouts",
                  "Account activity monitoring",
                ]}
              />

              <ProseSubHeading>Access Controls</ProseSubHeading>
              <p className="text-[#4A4A4A]">Our platform implements strict access controls:</p>
              <BulletList
                items={[
                  "Role-based access controls (RBAC)",
                  "Principle of least privilege for all system access",
                  "Detailed audit logs of all actions",
                  "Regular access reviews",
                ]}
              />

              <ProseHeading>Compliance and Certifications</ProseHeading>
              <p className="text-[#4A4A4A]">We adhere to relevant security frameworks and standards:</p>
              <BulletList
                items={[
                  "ISO 27001 (Information Security Management)",
                  "PDPA (Personal Data Protection Act) compliance",
                  "Regular security assessments and penetration testing",
                  "Compliance with financial regulatory requirements",
                ]}
              />

              <ProseHeading>Security Practices in our Organization</ProseHeading>

              <ProseSubHeading>Security Team</ProseSubHeading>
              <p className="text-[#4A4A4A]">We have a dedicated security team responsible for:</p>
              <BulletList
                items={[
                  "Continuous monitoring of security systems",
                  "Responding to security incidents",
                  "Implementing security improvements",
                  "Conducting security awareness training",
                ]}
              />

              <ProseSubHeading>Employee Security</ProseSubHeading>
              <p className="text-[#4A4A4A]">Our employees follow strict security protocols:</p>
              <BulletList
                items={[
                  "Background checks for all employees",
                  "Regular security awareness training",
                  "Secure access to systems and data",
                  "Clean desk policy and physical security measures",
                ]}
              />

              <ProseHeading>Your Role in Security</ProseHeading>
              <p className="text-[#4A4A4A]">
                While we implement robust security measures, your participation in security is also important:
              </p>
              <BulletList
                items={[
                  "Use strong, unique passwords for your account",
                  "Enable multi-factor authentication",
                  "Keep your login credentials confidential",
                  "Be vigilant against phishing attempts",
                  "Report any suspicious activities to our security team",
                  "Keep your contact information updated",
                  "Regularly review your account activity",
                ]}
              />

              <ProseHeading>Security Incident Response</ProseHeading>
              <p className="text-[#4A4A4A]">In the unlikely event of a security incident:</p>
              <BulletList
                items={[
                  "We have a comprehensive incident response plan",
                  "Our team will immediately investigate and contain the incident",
                  "Affected users will be promptly notified",
                  "We will work with relevant authorities if necessary",
                  "We will implement measures to prevent similar incidents",
                ]}
              />

              <div className="glass-panel rounded-3xl border border-[#E1BAC2]/40 bg-white/60 p-8">
                <SectionTag label="Commitment" />
                <h3 className="mt-5 font-display text-xl font-bold text-[#171414]">Our Security Commitment</h3>
                <p className="mt-3 text-[#4A4A4A]">
                  Security is not a one-time effort but a continuous process of improvement. We are committed to
                  continuously enhancing our security measures to protect your information and maintain your trust.
                </p>
              </div>

              <p className="text-[#4A4A4A]">
                If you have any questions or concerns about our security practices, or if you want to report a security
                vulnerability, please contact our security team at{" "}
                <a href="mailto:security@sanadprotocol.com" className="text-[#E1BAC2] underline underline-offset-4 hover:text-foreground">
                  security@sanadprotocol.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
