import { Card } from "@/components/ui/Card";

const faqs = [
  {
    q: "What does Nexora do?",
    a: "Nexora is the command center for Discord-powered communities. Phase one ships authentication and a dashboard foundation; phase two layers automations, analytics, and integrations on top."
  },
  {
    q: "Why Discord login?",
    a: "Discord is where modern communities live. By signing in with Discord we already know who you are, what servers you manage, and can deliver value from the first second."
  },
  {
    q: "Is my data safe?",
    a: "Sessions are encrypted JWTs, OAuth scopes are minimal, and all protected routes are enforced server-side. We never store your Discord password — that stays with Discord."
  },
  {
    q: "Can I self-host?",
    a: "Yes. Nexora is a standard Next.js + MongoDB project. Bring your own MongoDB, set the Discord OAuth credentials, and deploy anywhere Node runs."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neon-blue">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Questions, answered.
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((item) => (
            <Card key={item.q} variant="glass" interactive>
              <h3 className="font-display text-base font-semibold text-white">
                {item.q}
              </h3>
              <p className="mt-2 text-sm text-slate-400">{item.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
