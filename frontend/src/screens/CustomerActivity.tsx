import { useEffect, useMemo, useState } from "react";

type Activity = {
  id: string;
  category: string;
  type: string;
  title: string;
  details: string;
  timestamp: string;
  ip: string | null;
  severity: string;
  amount_cents: number | null;
};

type ActivityData = {
  summary: {
    successful_logins: number;
    failed_logins: number;
    transactions: number;
    account_changes: number;
  };
  events: Activity[];
};

const filters = ["all", "login", "transaction", "account", "security"];

function displayTime(value: string) {
  if (!value) return "Time unavailable";
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");
  const date = new Date(
    /Z$|[+-]\d\d:\d\d$/.test(normalized)
      ? normalized
      : normalized + "Z"
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });
}

export default function CustomerActivity() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleSection(section: string) {
    setExpanded(previous => ({
      ...previous,
      [section]: !previous[section]
    }));
  }

  function activitySection(
    sectionId: string,
    items: Activity[]
  ) {
    const isExpanded = Boolean(expanded[sectionId]);
    const visible = isExpanded ? items : items.slice(0, 3);
    const remaining = Math.max(0, items.length - 3);

    return (
      <>
        <div className="divide-y divide-[#29313b]">
          {activityRows(visible)}
        </div>

        {items.length > 3 && (
          <div className="border-t border-[#303943] bg-[#111820] px-5 py-4">
            <button
              type="button"
              onClick={() => toggleSection(sectionId)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#394b5b] bg-[#1c2935] px-4 py-3 text-sm font-medium text-[#d5e5f3] transition-all hover:border-[#91a8bb] hover:bg-[#26394b]"
            >
              {isExpanded
                ? "Show Less"
                : `View All (${remaining} more)`}
              <span className={
                "inline-block transition-transform duration-200 " +
                (isExpanded ? "rotate-180" : "")
              }>
                ↓
              </span>
            </button>
          </div>
        )}
      </>
    );
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/customer/activity", {
          credentials: "same-origin"
        });
        const type = response.headers.get("content-type") || "";
        if (!type.includes("application/json")) {
          throw new Error(
            `Activity API returned HTTP ${response.status} instead of JSON.`
          );
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load activity.");
        }
        if (active) setData(result);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Request failed.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const events = useMemo(
    () => data?.events.filter(
      item => filter === "all" || item.category === filter
    ) || [],
    [data, filter]
  );

  const sections = [
    { title: "Login History", category: "login" },
    { title: "Transaction Activity", category: "transaction" },
    { title: "Account Changes", category: "account" },
    { title: "Other Security Events", category: "security" }
  ];

  function activityRows(items: Activity[]) {
    if (!items.length) {
      return (
        <p className="px-5 py-7 text-sm text-[#8994a3]">
          No recorded activity in this section.
        </p>
      );
    }

    return items.map(item => (
      <div
        key={item.id}
        className="flex flex-col gap-2 border-b border-[#292f38] px-5 py-4 last:border-0 md:flex-row md:items-start md:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#e9eef5]">
              {item.title}
            </span>
            <span className={
              "rounded px-2 py-0.5 text-[10px] " +
              (item.type === "LOGIN_FAILED" ||
               item.severity === "CRITICAL"
                ? "bg-[#43282c] text-[#ff9fa8]"
                : "bg-[#263b35] text-[#a4e6cb]")
            }>
              {item.type === "LOGIN_FAILED"
                ? "Failed"
                : item.type === "LOGIN_SUCCESS"
                ? "Successful"
                : item.severity}
            </span>
          </div>
          {item.details && (
            <p className="mt-2 break-words text-xs text-[#a2aab6]">
              {item.details}
            </p>
          )}
          {item.ip && (
            <p className="mt-1 text-xs text-[#7f8c9c]">
              Source IP: {item.ip}
            </p>
          )}
          {item.amount_cents !== null && (
            <p className="mt-1 text-xs text-[#b8c6d5]">
              Recorded amount: {(item.amount_cents / 100).toFixed(2)}
              {" "} (account currency)
            </p>
          )}
        </div>
        <time className="shrink-0 text-xs text-[#8f9aaa]">
          {displayTime(item.timestamp)}
        </time>
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-[#080a0d] text-white">
      <main className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">
        <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#8d9bab]">
              RUSSELL WEALTH / CUSTOMER SECURITY
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Security & Activity
            </h1>
            <p className="mt-2 text-sm text-[#8f9aaa]">
              Your account access, transactions and security history.
            </p>
          </div>
          <a
            href="/customer/settings"
            className="rounded-lg border border-[#39424e] px-4 py-3 text-sm hover:bg-[#1c222b]"
          >
            Back to Account Settings
          </a>
        </div>

        {loading && (
          <p className="py-8 text-[#a4afbd]">Loading activity...</p>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-[#66353b] bg-[#271a1d] p-5 text-sm text-[#ffb4bc]">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Successful Logins", data.summary.successful_logins],
                ["Failed Logins", data.summary.failed_logins],
                ["Transactions", data.summary.transactions],
                ["Account Changes", data.summary.account_changes]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#354656] bg-gradient-to-br from-[#1d2b38] to-[#111820] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-colors hover:border-[#718ca3]"
                >
                  <p className="text-xs text-[#9da9b7]">{label}</p>
                  <p className="mt-3 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {sections.map(section => {
              const sectionEvents = data.events.filter(
                item => item.category === section.category
              );

              return (
                <section key={section.category} className="mb-10">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-[#f1f5f9]">
                        {section.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#8191a3]">
                        Latest recorded activity
                      </p>
                    </div>
                    <span className="rounded-full border border-[#364452] bg-[#1b2732] px-3 py-1 text-xs text-[#b8cddd]">
                      {sectionEvents.length} events
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#34404c] bg-[#141b23] shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
                    {activitySection(section.category, sectionEvents)}
                  </div>
                </section>
              );
            })}

            <section className="pb-12">
              <h2 className="mb-4 text-lg font-semibold">
                Complete Activity Timeline
              </h2>

              <div className="mb-4 flex flex-wrap gap-2">
                {filters.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={
                      "rounded-lg border px-4 py-2 text-xs capitalize " +
                      (filter === option
                        ? "border-[#a7bdce] bg-[#273849] text-white"
                        : "border-[#303943] text-[#a4afbd]")
                    }
                  >
                    {option === "all" ? "All Activity" : option}
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#34404c] bg-[#141b23] shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
                {activitySection("timeline-" + filter, events)}
              </div>

              <p className="mt-4 text-xs text-[#7f8c9c]">
                Showing up to 500 recorded security events and 500
                transactions. Unrecorded historical actions cannot be
                reconstructed.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
