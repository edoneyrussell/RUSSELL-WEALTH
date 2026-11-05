import CustomerSidebar from "../components/CustomerSidebar";
import { useMemo, useState } from "react";
import {
  Search, ChevronDown, ArrowUpRight, ShieldCheck,
  Wallet, ArrowLeftRight, CircleHelp, Mail,
  BookOpen, LockKeyhole, LifeBuoy
} from "lucide-react";

const faqs = [
  {
    category: "Portfolio",
    question: "How is my portfolio value calculated?",
    answer: "Your total portfolio value combines your available cash balance with the recorded market value of your holdings. Prices reflect the data available to the Russell Wealth demonstration platform."
  },
  {
    category: "Portfolio",
    question: "Why does my portfolio value change?",
    answer: "Portfolio value can change when recorded asset prices change, when funds are added or withdrawn, or when transactions affect your holdings. A change in total value is not necessarily an investment return."
  },
  {
    category: "Trading",
    question: "How do I buy or sell an asset?",
    answer: "Open the Trading section, select an available asset, choose Buy or Sell, enter the quantity, review the details, and submit your simulated trade."
  },
  {
    category: "Trading",
    question: "Are trades made with real money?",
    answer: "No. Russell Wealth is a fictional fintech and cybersecurity portfolio project. All accounts, balances, trades, and transactions are simulated."
  },
  {
    category: "Account",
    question: "Where can I review my transactions?",
    answer: "Select Transactions in the customer navigation to review the activity recorded for your demonstration account."
  },
  {
    category: "Account",
    question: "How do I update my account information?",
    answer: "Open Settings to review the account options available in this demonstration. Some account-management features may not be implemented."
  },
  {
    category: "Security",
    question: "How is account activity monitored?",
    answer: "The platform includes a separate security monitoring environment that demonstrates authentication logging, suspicious activity detection, investigation, and defensive controls."
  },
  {
    category: "Security",
    question: "What should I do if I notice suspicious activity?",
    answer: "Because this is a demonstration platform, do not enter real banking credentials or sensitive financial information. For a real financial account, contact the institution directly through its official support channels."
  }
];

const categories = ["All", "Portfolio", "Trading", "Account", "Security"];

export default function HelpSupport() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(
    "How is my portfolio value calculated?"
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter(item =>
      (category === "All" || item.category === category) &&
      (!q || (item.question + " " + item.answer + " " + item.category)
        .toLowerCase().includes(q))
    );
  }, [query, category]);

  const cards = [
    {
      title: "Portfolio & balances",
      description: "Understand holdings, valuation and performance.",
      icon: Wallet,
      category: "Portfolio"
    },
    {
      title: "Trading & activity",
      description: "Learn about simulated orders and transactions.",
      icon: ArrowLeftRight,
      category: "Trading"
    },
    {
      title: "Account & security",
      description: "Explore account settings and protection.",
      icon: ShieldCheck,
      category: "Security"
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#090b0e]"><CustomerSidebar /><main className="rw-help min-h-full w-full bg-[#090b0e] text-[#eeece7]">
      <style>{`
        .rw-help {
          font-family: Inter, sans-serif;
          background: radial-gradient(ellipse at 80% 0%, rgba(195,173,131,.07), transparent 44%), #090b0e;
        }
        .rw-help .rw-panel {
          background: #14181d;
          border: 1px solid #2c3138;
          border-radius: 16px;
        }
        .rw-help .rw-card {
          transition: border-color .25s ease, background .25s ease, transform .25s ease;
        }
        .rw-help .rw-card:hover {
          border-color: #76684e;
          background: #1a1e23;
          transform: translateY(-3px);
        }
        .rw-help .rw-faq {
          border-bottom: 1px solid #2c3138;
        }
        .rw-help .rw-faq:last-child { border-bottom: 0; }
        .rw-help .rw-faq button:focus-visible,
        .rw-help input:focus-visible {
          outline: 2px solid #c3ad83;
          outline-offset: 3px;
        }
        @media(prefers-reduced-motion: reduce) {
          .rw-help .rw-card { transition: none; }
          .rw-help .rw-card:hover { transform: none; }
        }
      `}</style>

      <div className="mx-auto max-w-[1180px] px-6 py-10 lg:px-10 lg:py-12">
        <div className="mb-9 flex items-center gap-2 text-[11px] text-[#969da6]">
          <span>RUSSELL WEALTH</span>
          <span className="text-[#565b61]">/</span>
          <span className="text-[#c3ad83]">HELP & SUPPORT</span>
        </div>

        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2 text-[#c3ad83]">
            <LifeBuoy size={16} />
            <span className="text-[11px] font-semibold tracking-[.19em] uppercase">
              Client assistance
            </span>
          </div>
          <h1 className="max-w-[750px] text-[clamp(34px,4vw,56px)] font-semibold leading-[1.1] tracking-[-.055em]">
            How can we <span className="text-[#c3ad83]">help you?</span>
          </h1>
          <p className="mt-5 max-w-[630px] text-[14px] leading-7 text-[#a4abb4]">
            Answers, guidance and resources to help you navigate the
            Russell Wealth demonstration platform.
          </p>

          <div className="mt-8 flex max-w-[680px] items-center gap-3 rounded-xl border border-[#343941] bg-[#171b20] px-5 py-4 focus-within:border-[#c3ad83]">
            <Search size={19} className="shrink-0 text-[#c3ad83]" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for answers..."
              aria-label="Search help articles"
              className="w-full bg-transparent text-[14px] text-[#eeece7] placeholder:text-[#777f89] outline-none"
            />
            <span className="hidden whitespace-nowrap text-[11px] text-[#777f89] sm:inline">
              KNOWLEDGE BASE
            </span>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold tracking-[-.025em]">
              Explore support
            </h2>
            <span className="text-[11px] tracking-[.13em] text-[#8c939c]">
              01 / RESOURCES
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => {
                    setCategory(card.category);
                    document.getElementById("rw-help-faq")?.scrollIntoView({
                      behavior: "smooth", block: "start"
                    });
                  }}
                  className="rw-panel rw-card min-h-[190px] p-6 text-left"
                >
                  <div className="mb-8 flex items-start justify-between">
                    <span className="rounded-lg border border-[#4b4335] bg-[#2a261f] p-3 text-[#c3ad83]">
                      <Icon size={20} />
                    </span>
                    <ArrowUpRight size={17} className="text-[#8d9298]" />
                  </div>
                  <h3 className="mb-2 text-[16px] font-semibold">{card.title}</h3>
                  <p className="text-[12px] leading-5 text-[#9ba2ac]">
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section id="rw-help-faq" className="mb-12 scroll-mt-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#c3ad83]">
                <BookOpen size={15} />
                <span className="text-[10px] font-semibold tracking-[.17em] uppercase">
                  Knowledge base
                </span>
              </div>
              <h2 className="text-[24px] font-semibold tracking-[-.035em]">
                Frequently asked questions
              </h2>
            </div>
            <span className="text-[11px] text-[#8c939c]">
              {results.length} ARTICLES
            </span>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={
                  "rounded-lg border px-4 py-2 text-[12px] transition-colors " +
                  (category === item
                    ? "border-[#7c6c50] bg-[#302a20] text-[#e3d1af]"
                    : "border-[#30343a] bg-[#15191e] text-[#a5acb5] hover:border-[#76684e]")
                }
              >
                {item}
              </button>
            ))}
          </div>

          <div className="rw-panel overflow-hidden px-5 sm:px-7">
            {results.length === 0 ? (
              <div className="py-12 text-center">
                <CircleHelp className="mx-auto mb-3 text-[#c3ad83]" size={24} />
                <p className="font-medium">No matching articles</p>
                <p className="mt-2 text-[12px] text-[#9ba2ac]">
                  Try another search or category.
                </p>
              </div>
            ) : results.map(item => {
              const open = expanded === item.question;
              return (
                <div className="rw-faq" key={item.question}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : item.question)}
                    className="flex w-full items-center justify-between gap-4 py-6 text-left"
                  >
                    <span className="text-[14px] font-medium leading-6">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={17}
                      className={
                        "shrink-0 text-[#c3ad83] transition-transform duration-300 " +
                        (open ? "rotate-180" : "")
                      }
                    />
                  </button>
                  {open && (
                    <p className="max-w-[780px] pb-6 pr-6 text-[13px] leading-7 text-[#a4abb4]">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rw-panel relative overflow-hidden p-7 sm:p-9">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#c3ad83]/[.045] blur-3xl" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[#c3ad83]">
                <LockKeyhole size={16} />
                <span className="text-[10px] font-semibold tracking-[.17em] uppercase">
                  Demonstration environment
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-[-.03em]">
                Built to explore. Designed to learn.
              </h2>
              <p className="mt-3 max-w-[640px] text-[13px] leading-6 text-[#a4abb4]">
                Russell Wealth is an independent fictional fintech and
                cybersecurity portfolio project. It does not offer real
                financial services, customer support, or live transactions.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#4b4335] bg-[#29251e] px-4 py-3 text-[12px] text-[#ddcba8]">
              <ShieldCheck size={17} />
              Simulation only
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#7f8791]">
          <span>© Russell Wealth · Independent portfolio project</span>
          <span>WHERE WEALTH MEETS INNOVATION</span>
        </div>
      </div>
    </main>
    </div>
  );
}
